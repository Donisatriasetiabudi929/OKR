import { Injectable, NotFoundException } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IProgres } from 'src/interface/progres.interface';
import { IKeyresult } from 'src/interface/keyresult.interface';
import { IProfile } from 'src/interface/profile.interface';
import { Readable } from 'stream';
import { CreateProgresDto } from 'src/dto/create.progres.dto';



@Injectable()
export class ProgresService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;
    constructor(private configService: ConfigService, @InjectModel('Progres') private progresModel: Model<IProgres>,
        @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
        @InjectModel('Keyresult') private readonly objektifModel: Model<IKeyresult>,
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

    async getProfileById(id: string): Promise<IProfile | null> {
        return this.profileModel.findById(id).exec();
    }
    async getKeyresultById(idKeyresult: string): Promise<IKeyresult | null> {
        return this.objektifModel.findById(idKeyresult).exec();
    }

    async getProfileByIdAuth(id_user: string): Promise<IProfile> {
        return this.profileModel.findOne({ id_user }).exec();
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

    async createProgres(createProgresDto: CreateProgresDto): Promise<IProgres> {
        const { id_projek, id_objek, id_keyresult, id_profile, nama_profile, foto_profile, tanggal, nama, total, file, link, status } = createProgresDto;
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());
        const existingProgres = await this.progresModel.findOne({ nama });

        if (existingProgres) {
            throw new Error('Progres dengan nama tersebut sudah ada');
        }

        const keyresult = await this.objektifModel.findById(id_keyresult);

        if (!keyresult) {
            throw new NotFoundException(`Keyresult dengan ID ${id_keyresult} tidak ditemukan`);
        }

        const newProgres = new this.progresModel({
            id_projek,
            id_objek,
            id_keyresult,
            id_profile,
            nama_profile,
            foto_profile,
            nama: nama1,
            tanggal,
            total,
            file,
            link,
            status: "Pending"
        });
        await this.deleteCache(`006`);
        await this.updateCache();
        return newProgres.save();
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

    async approveProgres(id_progres: string): Promise<IProgres> {
        const progres = await this.progresModel.findById(id_progres);

        if (!progres) {
            throw new NotFoundException(`Progres dengan ID ${id_progres} tidak ditemukan!`);
        }

        if (progres.status !== "Pending") {
            throw new Error('Progres ini sudah diapprove atau reject');
        }

        progres.status = "Approve";

        const keyresult = await this.objektifModel.findById(progres.id_keyresult);

        if (!keyresult) {
            throw new NotFoundException(`Keyresult dengan ID ${progres.id_keyresult} tidak ditemukan!`);
        }

        keyresult.current_value += progres.total; // Menggunakan progres.total

        await progres.save();
        await keyresult.save();

        await this.deleteCache(`004`);
        await this.deleteCache(`004:${keyresult.id}`);
        await this.deleteCache(`004:projek:${keyresult.id_projek}`);
        await this.deleteCache(`004:objek:${keyresult.id_objek}`);
        await this.updateCache();
        await this.updateCacheApprove();
        await this.deleteCache(`006`);
        await this.deleteCache(`006:pending`);
        await this.deleteCache(`006:approve`);
        await this.deleteCache(`006:keyresult:${progres.id_keyresult}`);


        return progres;
    }

    // Di dalam progresService

    async getPendingProgresByStatusAndKeyresult(idKeyresult: string): Promise<IProgres[]> {
        // Misalnya, Progres adalah model dari data progres
        const pendingProgres = await this.progresModel.find({ status: 'Pending', id_keyresult: idKeyresult }).exec();
        return pendingProgres;
    }

    async getProgresByIdKeyresult(idKeyresult: string): Promise<IProgres[]> {
        const cacheKey = `006:keyresult:${idKeyresult}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const keyresults = await this.progresModel.find({ id_keyresult: idKeyresult });
            if (!keyresults || keyresults.length === 0) {
                throw new NotFoundException(`Data keyresult dengan id_objek #${idKeyresult} tidak ditemukan`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(keyresults));
            return keyresults;
        }
    }

    async getAllPendingProgres(): Promise<IProgres[]> {
        const cacheKey = '006:pending'; // Cache key baru untuk data pending
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const pendingProgres = await this.progresModel.find({ status: 'Pending' }); // Filter berdasarkan status
            if (!pendingProgres || pendingProgres.length === 0) {
                throw new NotFoundException('Tidak ada data Progres dengan status \'Pending\' ditemukan');
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(pendingProgres));
            return pendingProgres;
        }
    }

    async getAllApproveProgres(): Promise<IProgres[]> {
        const cacheKey = '006:approve'; // Cache key baru untuk data pending
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const pendingProgres = await this.progresModel.find({ status: 'Approve' }); // Filter berdasarkan status
            if (!pendingProgres || pendingProgres.length === 0) {
                throw new NotFoundException('Tidak ada data Progres dengan status \'Approve\' ditemukan');
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(pendingProgres));
            return pendingProgres;
        }
    }

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.progresModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('006:pending', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 006) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 006): ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
        }
    }

    async updateCacheApprove(): Promise<void> {
        try {
            const uploudData = await this.progresModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('006:approve', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 006) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 006): ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
        }
    }






}