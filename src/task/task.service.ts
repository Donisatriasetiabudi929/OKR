import { Injectable, NotFoundException } from '@nestjs/common';
import { IProgrestask } from 'src/interface/progrestask.interface';
import * as Minio from 'minio';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITask } from 'src/interface/task.interface';
import { IProfile } from 'src/interface/profile.interface';
import { Readable } from 'stream';
import { CreateTaskDto } from 'src/dto/create.task.dto';


@Injectable()
export class TaskService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;

    constructor(
        private configService: ConfigService,
        @InjectModel('Task') private readonly taskModel: Model<ITask>,
        @InjectModel('Progrestask') private readonly progrestaskModel: Model<IProgrestask>,
        @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
    ){

        //Untuk menghubungkan redis server
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            //Optional
            db: 1
        });

        //Untuk menghubungkan ke MinIO Server
        this.minioClient = new Minio.Client({
            endPoint: '127.0.0.1',
            port: 9000,
            useSSL: false,
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY')
        });

    }

    async uploadFile(bucketName: string, objectName: string, stream: Readable, contentType: string): Promise<void> {
        const objectExists = await this.checkObjectExists(bucketName, objectName);

        if (objectExists) {
            throw new Error(`File dengan nama ${objectName} sudah ada di storage`);
        }

        await this.minioClient.putObject(bucketName, objectName, stream, null, {
            'Content-Type': contentType,
        });
    }
    async checkObjectExists(bucketName: string, objectName: string): Promise<boolean> {
        try {
            await this.minioClient.statObject(bucketName, objectName);
            return true;
        } catch (error) {
            if (error.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    async deleteFile(bucketName: string, objectName: string): Promise<void> {
        try {
            await this.minioClient.removeObject(bucketName, objectName);
            console.log(`File ${objectName} telah dihapus dari Minio`);
        } catch (error) {
            console.error(`Error saat menghapus file dari Minio: ${error}`);
            throw new Error('Terjadi kesalahan saat menghapus file dari Minio');
        }
    }
    async deleteCache(key: string): Promise<void> {
        try {
            await this.Redisclient.del(key);
            console.log(`Cache dengan key ${key} telah dihapus dari Redis`);
        } catch (error) {
            console.error(`Error saat menghapus cache dari Redis: ${error}`);
            throw new Error('Terjadi kesalahan saat menghapus cache dari Redis');
        }
    }


async createTask(createTaskDto: CreateTaskDto): Promise<ITask> {
    const { nama, deskripsi, file, link, assign_to, nama_profile, foto_profile, start_date, end_date, status } = createTaskDto;
    const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());
    const deskrpisi1 = deskripsi.replace(/\b\w/g, (char) => char.toUpperCase());

    const newTask = new this.taskModel({
        nama: nama1,
        deskripsi: deskrpisi1,
        file,
        link,
        assign_to,
        nama_profile,
        foto_profile,
        start_date,
        end_date,
        status: "Belum Selesai"
    });

    await this.deleteCache(`110`);
    await this.deleteCache(`110:pending`);
    await this.deleteCache(`110:profile:${newTask.assign_to}`);

    return newTask.save();
}

async updateTask(
    taskId: string,
    nama: string,
    deskripsi: string,
    filee: string,
    link: string,
    assign_to: string,
    nama_profile: string,
    foto_profile: string,
    start_date: string,
    end_date: string,
    status: string
): Promise<ITask> {

    const existingTask = await this.taskModel.findById(taskId);

    if (!existingTask) {
        throw new NotFoundException(`Keyresult dengan ID ${taskId} tidak ditemukan`);
    }

    const updatedUploud = await this.taskModel.findByIdAndUpdate(
        taskId,
        {
            nama,
            deskripsi,
            file: filee || undefined,  // Set to undefined if filee is falsy
            link,
            assign_to,
            nama_profile,
            foto_profile,
            start_date,
            end_date,
            status
        },
        { new: true }
    );

    if (!updatedUploud) {
        throw new NotFoundException(`Task dengan ID ${taskId} tidak ditemukan`);
    }

    // Update nama to be capitalized
    updatedUploud.nama = updatedUploud.nama.replace(/\b\w/g, (char) => char.toUpperCase());
    updatedUploud.deskripsi = updatedUploud.deskripsi.replace(/\b\w/g, (char) => char.toUpperCase());


    await updatedUploud.save();
    await this.deleteCache(`110`);
    await this.deleteCache(`110:${taskId}`);
    await this.deleteCache(`110:pending`);
    await this.deleteCache(`110:profile:${updatedUploud.assign_to}`);
    return updatedUploud;
}

async getProfileById(id: string): Promise<IProfile | null> {
    return this.profileModel.findById(id).exec();
}
async getTaskById(taskId: string): Promise<ITask | null> {
    return this.taskModel.findById(taskId).exec();
}

async getAllTask(): Promise<ITask[]> {
    const cachedData = await this.Redisclient.get('110');

    if (cachedData) {
        return JSON.parse(cachedData);
    } else {
        const taskData = await this.taskModel.find()
            .sort({ start_date: -1 }) // Mengurutkan berdasarkan start_date secara menurun (dari yang terbaru)
            .limit(10); // Ambil 10 data terbaru

        if (!taskData || taskData.length === 0) {
            throw new NotFoundException('Data task tidak ada!');
        }

        await this.Redisclient.setex('110', 3600, JSON.stringify(taskData));
        return taskData;
    }
}


async getTask(taskId: string): Promise<ITask> {
    const cacheKey = `110:${taskId}`;
    const cachedData = await this.Redisclient.get(cacheKey);
    if (cachedData) {
        // Jika data tersedia di cache, parse data JSON dan kembalikan
        return JSON.parse(cachedData);
    } else {
        const existingTask = await this.taskModel.findById(taskId)
        if (!existingTask) {
            throw new NotFoundException(`Task dengan #${taskId} tidak tersedia`);
        }
        await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(existingTask));
        return existingTask;
    }
}

async getTaskByIdProfile(idProfile: string): Promise<ITask[]> {
    const cacheKey = `110:profile:${idProfile}`;
    const cachedData = await this.Redisclient.get(cacheKey);
    if (cachedData) {
        // Jika data tersedia di cache, parse data JSON dan kembalikan
        return JSON.parse(cachedData);
    } else {
        const tasks = await this.taskModel.find({ assign_to: idProfile });
        if (!tasks || tasks.length === 0) {
            throw new NotFoundException(`Data task dengan assign_to #${idProfile} tidak ditemukan`);
        }
        await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(tasks));
        return tasks;
    }
}
async deleteTask(taskId: string): Promise<void> {
    const deleteTask = await this.taskModel.findByIdAndDelete(taskId);

    if (!deleteTask) {
        throw new NotFoundException(`Keyresult dengan ID ${taskId} tidak tersedia!`);
    }

    const deleteprogres = await this.progrestaskModel.find({ id_task: taskId });

    for (const progres of deleteprogres) {
        if (progres.files && progres.files.length > 0) {
            for (const file of progres.files) {
                await this.deleteFile('okr.progrestask', file);
            }
        }
    }

    await this.progrestaskModel.deleteMany({ id_task: taskId });

    // Hapus file jika ada
    if (deleteTask.file) {
        await this.deleteFile('okr.task', deleteTask.file);
    }

    await this.deleteCache(`110`);
    await this.deleteCache(`120`);
    await this.deleteCache(`110:${taskId}`);
    await this.deleteCache(`110:pending`);
    await this.deleteCache(`110:profile:${deleteTask.assign_to}`);
    await this.deleteCache(`120:pending`);
    await this.deleteCache(`120:task:${deleteTask.id}`);
}

async getAllpendingTask(): Promise<ITask[]> {
    const cacheKey = '110:pending'; 
    const cachedData = await this.Redisclient.get(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    } else {
        const pendingtask = await this.taskModel.find({ status: 'Pending' }) // Filter berdasarkan status
                                             .sort({ start_date: -1 }); // Menyortir berdasarkan start_date dari yang terbaru
        if (!pendingtask || pendingtask.length === 0) {
            throw new NotFoundException('Tidak ada data task dengan status \'Pending\' ditemukan');
        }
        await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(pendingtask));
        return pendingtask;
    }
}



}
