import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateKeyresultDto } from 'src/dto/create.keyresult.dto';
import { IKeyresult } from 'src/interface/keyresult.interface';
import { IProfile } from 'src/interface/profile.interface';
import { Redis } from 'ioredis';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { randomBytes } from 'crypto';


@Injectable()
export class KeyresultService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;
    constructor(private configService: ConfigService, @InjectModel('Keyresult') private keyresultModel: Model<IKeyresult>,
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

    async getProfileById(id: string): Promise<IProfile | null> {
        return this.profileModel.findById(id).exec();
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

    async createKeyresult(createKeyresultDto: CreateKeyresultDto): Promise<IKeyresult> {
        const { id_projek, id_objek, nama, file, link, assign_to, nama_profile, foto_profile, target_value, current_value, status } = createKeyresultDto;

        const existingKeyresult = await this.keyresultModel.findOne({ nama });

        if (existingKeyresult) {
            throw new Error('Objektif dengan nama tersebut sudah ada');
        }

        const newKeyresult = new this.keyresultModel({
            id_projek,
            id_objek,
            nama,
            file,
            link,
            assign_to,
            nama_profile,
            foto_profile,
            target_value,
            current_value: "0",
            status: "Progress"
        });

        return newKeyresult.save(); 
    }

    async updateKeyresult(
        keyresultId: string,
        id_projek: string, 
        id_objek: string, 
        nama: string, 
        filee: string, 
        link: string,
        assign_to: string,
        nama_profile: string,
        foto_profile: string,
        target_value: string,
        current_value: string,
        status
    ): Promise<IKeyresult> {
        const updatedUploud = await this.keyresultModel.findByIdAndUpdate(
            keyresultId,
            { 
                id_projek, 
                id_objek,
                nama,
                file: filee || undefined,  // Set to undefined if filee is falsy
                link,
                assign_to,
                nama_profile,
                foto_profile,
                target_value,
                current_value,
                status
            },
            { new: true }
        );
    
        if (!updatedUploud) {
            throw new NotFoundException(`Keyresult dengan ID ${keyresultId} tidak ditemukan`);
        }
    
        return updatedUploud;
    }
    

    async getKeyresultById(keyresultId: string): Promise<IKeyresult | null> {
        return this.keyresultModel.findById(keyresultId).exec();
    }
    
    
    

}
