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
import { IProjek } from 'src/interface/projek.interface';
import { IProgres } from 'src/interface/progres.interface';


@Injectable()
export class KeyresultService {
    private readonly Redisclient: Redis;
    private minioClient: Minio.Client;
    constructor(private configService: ConfigService, @InjectModel('Keyresult') private keyresultModel: Model<IKeyresult>,
        @InjectModel('Profile') private readonly profileModel: Model<IProfile>,
        @InjectModel('Objektif') private readonly objektifModel: Model<IObjektif>,
        @InjectModel('Projek') private readonly projekModel: Model<IProjek>,
        @InjectModel('Progres') private readonly progresModel: Model<IProgres>,
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
        const { id_projek, id_objek, nama, file, link, assign_to, nama_profile, foto_profile, target_value, days, current_value, status } = createKeyresultDto;
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());

        const existingKeyresult = await this.keyresultModel.findOne({ nama });

        if (existingKeyresult) {
            throw new Error('Objektif dengan nama tersebut sudah ada');
        }

        const objektif = await this.objektifModel.findById(id_objek);

        if (!objektif) {
            throw new NotFoundException(`Objektif dengan ID ${id_objek} tidak ditemukan`);
        }

        let newStatus = status; // Menyimpan status yang akan digunakan

        if (objektif.status === "Selesai") {
            // Jika status objektif adalah "Finish", maka ubah status keyresult menjadi "Progress"
            newStatus = "Progress";
            objektif.status = "Progress"; // Ubah status objektif menjadi "Progress"
            await objektif.save(); // Simpan perubahan
        }

        const projek = await this.projekModel.findById(id_projek);
        if (!projek) {
            throw new NotFoundException(`Projek dengan id ${id_projek} tidak ditemukan`);
        }
        if (projek.status === "Selesai") {
            // Jika status projek adalah "Finish", maka ubah status keyresult menjadi "Progress"
            newStatus = "Progress";
            projek.status = "Progress"; // Ubah status projek menjadi "Progress"
            await projek.save(); // Simpan perubahan
        }


        const newKeyresult = new this.keyresultModel({
            id_projek,
            id_objek,
            nama: nama1,
            file,
            link,
            assign_to,
            nama_profile,
            foto_profile,
            target_value,
            days,
            current_value: 0,
            status: "Progress"
        });

        await this.deleteCache(`004`);
        await this.deleteCache(`002`);
        await this.deleteCache(`003`);
        await this.deleteCache(`003:${newKeyresult.id_objek}`);
        await this.deleteCache(`003:projek:${newKeyresult.id_projek}`);
        await this.deleteCache(`002:${newKeyresult.id_projek}`);
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
        days: string,
        current_value: number,
        status
    ): Promise<IKeyresult> {

        const existingKeyresult = await this.keyresultModel.findById(keyresultId);

        if (!existingKeyresult) {
            throw new NotFoundException(`Keyresult dengan ID ${keyresultId} tidak ditemukan`);
        }

        // Mengambil nilai current_value dari data keyresult

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
                days,
                current_value, // Pastikan status disimpan dengan benar
                status

            },
            { new: true }
        );

        if (!updatedUploud) {
            throw new NotFoundException(`Keyresult dengan ID ${keyresultId} tidak ditemukan`);
        }

        // Update nama to be capitalized
        updatedUploud.nama = updatedUploud.nama.replace(/\b\w/g, (char) => char.toUpperCase());
        const currentValueFromDb = existingKeyresult.current_value;
        const value_target = parseInt(target_value);
        const value_current = currentValueFromDb;
        const kondisi = value_target < value_current;
        if (kondisi) {
            throw new Error('Gagal update keyresult (Target value kurang dari current value)');

        }
        console.log('data terget value yang diinput' + updatedUploud.target_value);
        console.log('data current valuenya' + existingKeyresult.current_value);


        if (parseInt(updatedUploud.target_value) === Number(existingKeyresult.current_value)) {
            updatedUploud.status = "Selesai";
            await updatedUploud.save();

            const keyresultsWithSameObjek = await this.keyresultModel.find({ id_objek: updatedUploud.id_objek });
            const totalCurrentValues = keyresultsWithSameObjek.reduce((total, key) => total + Number(key.current_value), 0);
            if (totalCurrentValues >= keyresultsWithSameObjek.length * parseInt(updatedUploud.target_value)) {
                const objek = await this.objektifModel.findById(updatedUploud.id_objek);
                if (!objek) {
                    throw new NotFoundException(`Objek dengan ID ${updatedUploud.id_objek} tidak ditemukan!`);
                }
                objek.status = "Selesai"; // Mengubah status objek menjadi "Finish"
                await objek.save();
    
                
                const projek = await this.projekModel.findById(updatedUploud.id_projek);
                if (!projek) {
                    throw new NotFoundException(`projek dengan ID ${updatedUploud.id_projek} tidak ditemukan!`);
                }
                if(projek.status === "Draft"){
                    projek.status= "Draft";
                    await projek.save();
                }else {
                    projek.status = "Selesai";
                    await projek.save();
                }
            }
        } else {
            // Jika target_value diubah, ubah status objektif menjadi "Progress"
            const objektif = await this.objektifModel.findById(updatedUploud.id_objek);
            if (objektif) {
                objektif.status = "Progres";
                await objektif.save();
            }
            console.log(objektif);

            const projek = await this.projekModel.findById(updatedUploud.id_projek);
            if(projek.status === "Draft"){
                projek.status= "Draft";
                await projek.save();
            }else {
                projek.status = "Progres";
                await projek.save();
            }
            console.log(projek);

            const keyresult = await this.keyresultModel.findById(keyresultId);
            if (keyresult) {
                keyresult.status = "Progres";
                await keyresult.save();
            }
        }
        existingKeyresult.current_value = current_value;


        console.log("nilai target" + value_target);
        console.log("nilai current" + value_current);
        console.log(kondisi);





        await updatedUploud.save();

        // Simpan perubahan ke database

        await this.deleteCache(`004`);
        await this.deleteCache(`002`);
        await this.deleteCache(`003`);
        await this.deleteCache(`003:${updatedUploud.id_objek}`);
        await this.deleteCache(`003:projek:${updatedUploud.id_projek}`);
        await this.deleteCache(`002:${updatedUploud.id_projek}`);
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

    async deleteKeyresult(keyresultId: string): Promise<void> {
        const deletedKeyresult = await this.keyresultModel.findByIdAndDelete(keyresultId);

        if (!deletedKeyresult) {
            throw new NotFoundException(`Keyresult dengan ID ${keyresultId} tidak tersedia!`);
        }

        const deleteprogres = await this.progresModel.find({ id_keyresult: keyresultId });

        for (const progres of deleteprogres) {
            if (progres.file) {
                await this.deleteFile('okr.progres', progres.file);
            }
        }

        await this.progresModel.deleteMany({ id_keyresult: keyresultId });

        // Hapus file jika ada
        if (deletedKeyresult.file) {
            await this.deleteFile('okr.keyresult', deletedKeyresult.file);
        }

        // Memeriksa apakah total current_value mencapai target_value
        const objekId = deletedKeyresult.id_objek;
        const keyresults = await this.keyresultModel.find({ id_objek: objekId });
        let totalCurrentValue = 0;
        let totalTargetValue = 0;

        keyresults.forEach(keyresult => {
            totalCurrentValue += keyresult.current_value;
            totalTargetValue += parseInt(keyresult.target_value);
        });

        if (totalCurrentValue >= totalTargetValue) {
            // Jika totalCurrentValue >= totalTargetValue, ubah status objektif dan projek menjadi "Finish"
            const objektif = await this.objektifModel.findById(objekId);
            if (objektif) {
                objektif.status = "Selesai";
                await objektif.save();
            }

            const projekId = objektif?.id_projek;
            const projek = await this.projekModel.findById(projekId);
            if (projek) {
                projek.status = "Selesai";
                await projek.save();
            }
            await this.deleteCache(`004`);
            await this.deleteCache(`002`);
            await this.deleteCache(`003`);
            await this.deleteCache(`003:${deletedKeyresult.id_objek}`);
            await this.deleteCache(`003:projek:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`002:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`004:${deletedKeyresult.id}`);
            await this.deleteCache(`004:projek:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`004:objek:${deletedKeyresult.id_objek}`);
        } else {
            // Jika totalCurrentValue < totalTargetValue, ubah status objektif dan projek menjadi "Progress"
            const objektif = await this.objektifModel.findById(objekId);
            if (objektif) {
                objektif.status = "Progress";
                await objektif.save();
            }

            const projekId = objektif?.id_projek;
            const projek = await this.projekModel.findById(projekId);
            if (projek) {
                projek.status = "Progress";
                await projek.save();
            }
            await this.deleteCache(`004`);
            await this.deleteCache(`002`);
            await this.deleteCache(`003`);
            await this.deleteCache(`003:${deletedKeyresult.id_objek}`);
            await this.deleteCache(`003:projek:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`002:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`004:${deletedKeyresult.id}`);
            await this.deleteCache(`004:projek:${deletedKeyresult.id_projek}`);
            await this.deleteCache(`004:objek:${deletedKeyresult.id_objek}`);
        }
    }


}
