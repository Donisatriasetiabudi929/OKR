import { Injectable, NotFoundException } from '@nestjs/common';
import * as Minio from 'minio';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITask } from 'src/interface/task.interface';
import { IProfile } from 'src/interface/profile.interface';
import { IProgrestask } from 'src/interface/progrestask.interface';
import { Readable } from 'stream';


@Injectable()
export class ProgrestaskService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;

    constructor(
        private configService: ConfigService,
        @InjectModel('Task') private readonly taskModel: Model<ITask>,
        @InjectModel('Progrestask') private readonly progrestaskModel: Model<IProgrestask>,
        @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
    ) {

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

    generateRandomCode(length: number = 10): string {
        //Variable untuk value random
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        //Variable untuk melakukan looping
        let code = '';
        //Proses looping 
        for (let i = 0; i < length; i++) {
            //untuk menghasilkan index secara acak
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters.charAt(randomIndex);
        }
        return code;
    }

    async getProfileById(id: string): Promise<IProfile | null> {
        return this.profileModel.findById(id).exec();
    }

    async createUploud(
        id_task: string,
        id_profile: string,
        nama_profile: string,
        foto_profile: string,
        tanggal: string,
        note: string,
        namaFiles: string[],
        link: string,
        status: string
    ): Promise<IProgrestask> {
        const kode = this.generateRandomCode();
        const note1 = note.replace(/\b\w/g, (char) => char.toUpperCase());
        const newUploud = await new this.progrestaskModel({
            id_task,
            id_profile,
            nama_profile,
            foto_profile,
            tanggal,
            note: note1,
            files: namaFiles, // Memastikan files disimpan sebagai array
            link,
            status: "Pending"
        });
        const task = await this.taskModel.findById(newUploud.id_task);
        if (!task) {
            throw new NotFoundException(`Task dengan ID ${newUploud.id_task} tidak ditemukan!`);
        }
        task.status = "Pending"; // Mengubah status objek menjadi "Finish"
        await task.save();
        await this.deleteCache(`110:pending`);
        await this.deleteCache(`120`);
        await this.deleteCache(`120:pending`);
        await this.deleteCache(`120:task:${newUploud.id_task}`);
        return newUploud.save();
    }

    

    async getProfileByIdAuth(id_user: string): Promise<IProfile> {
        return this.profileModel.findOne({ id_user }).exec();
    }

    async getTaskById(idTask: string): Promise<ITask | null> {
        return this.taskModel.findById(idTask).exec();
    }

    async getProgresTaskById(progrestaskId: string): Promise<IProgrestask | null> {
        return this.progrestaskModel.findById(progrestaskId).exec();
    }

    async updateProgresTask(
        progrestaskId: string,
        note: string,
        namaFiles: string[],
        link: string
    ): Promise<IProgrestask> {
        const updatedProgrestask = await this.progrestaskModel.findByIdAndUpdate(
            progrestaskId,
            {
                note: note.replace(/\b\w/g, (char) => char.toUpperCase()),
                files: namaFiles,
                link: link
            },
            { new: true }
        );
    
        if (!updatedProgrestask) {
            throw new NotFoundException(`Data Progres task dengan ID ${progrestaskId} tidak tersedia!`);
        }
    
        await this.deleteCache(`120`);
        await this.deleteCache(`120:pending`);
        await this.deleteCache(`110:pending`);
        await this.deleteCache(`120:task:${updatedProgrestask.id_task}`);
        return updatedProgrestask;
    }

    async approveProgresTask(id_progres: string): Promise<IProgrestask> {
        const progrestask = await this.progrestaskModel.findById(id_progres);

        if (!progrestask) {
            throw new NotFoundException(`progrestask dengan ID ${id_progres} tidak ditemukan!`);
        }

        if (progrestask.status !== "Pending") {
            throw new Error('Progres ini sudah diapprove atau reject');
        }

        progrestask.status = "Approve";

        const task = await this.taskModel.findById(progrestask.id_task);

        if (!task) {
            throw new NotFoundException(`Keyresult dengan ID ${progrestask.id_task} tidak ditemukan!`);
        }
        task.status = "Selesai";

        await progrestask.save();
        await task.save();
        await this.deleteCache(`110`);
        await this.deleteCache(`110:profile:${progrestask.id_profile}`);
        await this.deleteCache(`110:pending`);
        await this.deleteCache(`120`);
        await this.deleteCache(`120:pending`);
        await this.deleteCache(`120:task:${progrestask.id_task}`);
        return progrestask;
    }

    async getAllpendingProgrestaskTask(): Promise<IProgrestask[]> {
        const cacheKey = '120:pending'; // Cache key baru untuk data pending
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const pendingProgrestask = await this.progrestaskModel.find({ status: 'Pending' }); // Filter berdasarkan status
            if (!pendingProgrestask || pendingProgrestask.length === 0) {
                throw new NotFoundException('Tidak ada data Progres task dengan status \'Pending\' ditemukan');
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(pendingProgrestask));
            return pendingProgrestask;
        }
    }

    async getProgrestaskByIdTask(idTask: string): Promise<IProgrestask[]> {
        const cacheKey = `120:task:${idTask}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const tasks = await this.progrestaskModel.find({ id_task: idTask });
            if (!tasks || tasks.length === 0) {
                throw new NotFoundException(`Data progres task dengan id_task #${idTask} tidak ditemukan`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(tasks));
            return tasks;
        }
    }
    async getProgresTask(progrestaskId:string):Promise<IProgrestask>{
        const existingprogrestask = await this.progrestaskModel.findById(progrestaskId)
        if (!existingprogrestask){
            throw new NotFoundException(`Progres task dengan #${progrestaskId} tidak tersedia`);
        }
        return existingprogrestask;
    }
}
