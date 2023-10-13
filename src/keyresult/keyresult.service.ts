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
import { IObjektif } from 'src/interface/objektif.interface';


@Injectable()
export class KeyresultService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;
    constructor(private configService: ConfigService, @InjectModel('Keyresult') private keyresultModel: Model<IKeyresult>,
        @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
        @InjectModel('Objektif') private readonly objektifModel: Model<IObjektif>,
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
    async getObjekById(idObjek: string): Promise<IObjektif | null> {
        return this.objektifModel.findById(idObjek).exec();
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
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());

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
            current_value: 0,
            status: "Progress"
        });

        await this.deleteCache(`004`);
        await this.deleteCache(`004:${newKeyresult.id}`);
        await this.deleteCache(`004:projek:${newKeyresult.id_projek}`);
        await this.deleteCache(`004:objek:${newKeyresult.id_objek}`);

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
        current_value: number,
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
    
        // Update nama to be capitalized
        updatedUploud.nama = updatedUploud.nama.replace(/\b\w/g, (char) => char.toUpperCase());
        await updatedUploud.save();  // Simpan perubahan ke database
    
        await this.deleteCache(`004`);
        await this.deleteCache(`004:${updatedUploud.id}`);
        await this.deleteCache(`004:projek:${updatedUploud.id_projek}`);
        await this.deleteCache(`004:objek:${updatedUploud.id_objek}`);
        
        return updatedUploud;
    }
    


    async getKeyresultById(keyresultId: string): Promise<IKeyresult | null> {
        return this.keyresultModel.findById(keyresultId).exec();
    }

    async getAllKeyresult(): Promise<IKeyresult[]> {
        const cachedData = await this.Redisclient.get('004');

        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const keyresultData = await this.keyresultModel.find()
            if (!keyresultData || keyresultData.length == 0) {
                throw new NotFoundException('Data Keyresult tidak ada!');
            }
            await this.Redisclient.setex('004', 3600, JSON.stringify(keyresultData));
            return keyresultData;
        }
    }

    async getKeyresult(keyresultId: string): Promise<IKeyresult> {
        const cacheKey = `004:${keyresultId}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const existingKeyresult = await this.keyresultModel.findById(keyresultId)
            if (!existingKeyresult) {
                throw new NotFoundException(`Projek dengan #${keyresultId} tidak tersedia`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(existingKeyresult)); 
            return existingKeyresult;
        }
    }

    async getKeyresultsByProjekId(idProjek: string): Promise<IKeyresult[]> {
        const cacheKey = `004:projek:${idProjek}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const keyresults = await this.keyresultModel.find({ id_projek: idProjek });
            if (!keyresults || keyresults.length === 0) {
                throw new NotFoundException(`Data keyresult dengan id_projek #${idProjek} tidak ditemukan`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(keyresults));
            return keyresults;
        }

    }

    async getKeyresultsByObjekId(idObjektif: string): Promise<IKeyresult[]> {
        const cacheKey = `004:objek:${idObjektif}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const keyresults = await this.keyresultModel.find({ id_objek: idObjektif });
            if (!keyresults || keyresults.length === 0) {
                throw new NotFoundException(`Data keyresult dengan id_objek #${idObjektif} tidak ditemukan`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(keyresults));
            return keyresults;
        }
    }

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.objektifModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('004', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 004) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 004): ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
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

}
