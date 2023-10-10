import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import * as Minio from 'minio';
import { Model } from 'mongoose';
import { IProfile } from 'src/interface/profile.interface';
import { User } from 'src/schema/user.schema';
import { Readable } from 'stream';

@Injectable()
export class ProfileService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;
    AuthService: any;

    constructor(private configService: ConfigService, @InjectModel('Profile') private profileModel: Model<IProfile>, @InjectModel('User') private userModel: Model<User>) {
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

    // ...

    async createUploud(
        id_user: string,
        email: string,
        role: string,
        nama: string,
        divisi: string,
        notelpon: string,
        gender: string,
        tanggal_lahir: string,
        namaFile: string,
        bio: string,
        sosmed: string[],
        grade: string
    ): Promise<IProfile> {
        const existingProfile = await this.profileModel.findOne({ id_user });

        if (existingProfile) {
            throw new Error(`Profil dengan id_auth ${id_user} sudah ada`);
        }

        const newUploud = await new this.profileModel({
            id_user,
            email,
            role,
            nama,
            divisi,
            notelpon,
            gender,
            tanggal_lahir,
            foto: namaFile,
            bio,
            sosmed,
            grade: '0'
        });
        await this.deleteCache(`001`);
        return newUploud.save();
    }


    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.profileModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('001', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 001) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 001): ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
        }
    }



    async getProfileByIdAuth(id_user: string): Promise<IProfile> {
        const cacheKey = `001:${id_user}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const tampil = await this.profileModel.findOne({ id_user }).exec();
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(tampil)); 
            return tampil;
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

    // async getProfileByEmail(email: string): Promise<IProfile> {
    //     return this.profileModel.findOne({ email }).exec();
    // }


    async getUploud(uploudId: string): Promise<IProfile> {
        const uploudData = await this.profileModel.findById(uploudId);
        if (!uploudData) {
            throw new NotFoundException(`Data uploud dengan ID ${uploudId} tidak ditemukan!`);
        }
        return uploudData;
    }

    // ...

    async updateUploud(
        uploudId: string,
        nama: string,
        email: string,
        divisi: string,
        notelpon: string,
        gender: string,
        tanggal_lahir: string,
        namefile: string,
        bio: string,
        sosmed: string[]
    ): Promise<IProfile> {
        const updatedUploud = await this.profileModel.findByIdAndUpdate(
            uploudId,
            {
                nama,
                email,
                divisi,
                notelpon,
                gender,
                tanggal_lahir,
                foto: namefile,
                bio,
                sosmed
            },
            { new: true }
        );

        if (!updatedUploud) {
            throw new NotFoundException(`Profil dengan ID ${uploudId} tidak ditemukan`);
        }

        // Perbarui cache untuk data profil
        await this.updateCache();
        await this.deleteCache(`001:${updatedUploud.id_user}`);

        return updatedUploud;
    }

    // ...



    async deleteFile(bucketName: string, objectName: string): Promise<void> {
        try {
            await this.minioClient.removeObject(bucketName, objectName);
            console.log(`File ${objectName} telah dihapus dari Minio`);
        } catch (error) {
            console.error(`Error saat menghapus file dari Minio: ${error}`);
            throw new Error('Terjadi kesalahan saat menghapus file dari Minio');
        }
    }

    async updateRole(profileId: string, role: string): Promise<IProfile> {
        const existingProfile = await this.profileModel.findByIdAndUpdate(profileId, { role }, { new: true });
        if (!existingProfile) {
            throw new NotFoundException(`User #${profileId} tidak tersedia!`);
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            existingProfile.id_user,
            { role },
            { new: true }
        );

        if (!updatedUser) {
            throw new NotFoundException(`Pengguna dengan ID ${existingProfile.id_user} tidak ditemukan`);
        }

        await this.updateCache(); // Pastikan Anda memiliki metode ini di service Anda

        return existingProfile;
    }

    async deleteProfile(profileId: string): Promise<IProfile> {
        const deletedProfile = await this.profileModel.findByIdAndDelete(profileId);

        if (!deletedProfile) {
            throw new NotFoundException(`Data uploud dengan ID ${profileId} tidak tersedia!`);
        }
        return deletedProfile;
    }

    async getAllProfile(): Promise<IProfile[]> {
        const cachedData = await this.Redisclient.get('001');

        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const profileDataa = await this.profileModel.find();
            if (!profileDataa || profileDataa.length === 0) {
                throw new NotFoundException('Data profile tidak ada!');
            }

            await this.Redisclient.setex('001', 3600, JSON.stringify(profileDataa));
            return profileDataa;
        }
    }


}
