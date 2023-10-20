import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateObjektifDto } from 'src/dto/create.objektif.dto';
import { IObjektif } from 'src/interface/objektif.interface';
import { Redis } from 'ioredis';
import { IProjek } from 'src/interface/projek.interface';
import { IProgres } from 'src/interface/progres.interface';
import { IKeyresult } from 'src/interface/keyresult.interface';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ObjektifService {
    private minioClient: Minio.Client;
    private readonly Redisclient: Redis;

    constructor(
        private configService: ConfigService,
        @InjectModel('Objektif') private objektifModel: Model<IObjektif>,
        @InjectModel('Projek') private projekModel: Model<IProjek>,
        @InjectModel('Progres') private progresModel: Model<IProgres>,
        @InjectModel('Keyresult') private keyresultModel: Model<IKeyresult>,
    ) {
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            //Optional
            db: 1
        });
        this.minioClient = new Minio.Client({
            endPoint: '127.0.0.1',
            port: 9000,
            useSSL: false,
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY')
        });
    }

    async createObjektif(createObjektifDto: CreateObjektifDto): Promise<IObjektif> {
        const { id_projek, nama, start_date, end_date } = createObjektifDto;
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());
        const existingObjektif = await this.objektifModel.findOne({ nama });
        if (existingObjektif) {
            throw new Error('Objektif dengan nama tersebut sudah ada');
        }

        const projek = await this.projekModel.findById(id_projek);
        if(!projek){
            throw new NotFoundException(`Projek dengan id ${id_projek} tidak ditemukan`);
        }
        if (projek.status === "Selesai") {
            // Jika status projek adalah "Finish", maka ubah status keyresult menjadi "Progress"
            projek.status = "Progress"; // Ubah status projek menjadi "Progress"
            await projek.save(); // Simpan perubahan
        }

        const newObjektif = new this.objektifModel({
            id_projek,
            nama: nama1,
            start_date,
            end_date,
            status: "Progres"
        });
        await this.deleteCache(`003`);
        await this.deleteCache(`002`);
        await this.deleteCache(`002:${newObjektif.id_projek}`);
        await this.deleteCache(`003:${newObjektif.id}`);
        await this.deleteCache(`003:projek:${newObjektif.id_projek}`);

        return newObjektif.save();
    }


    async updateObjektif(objektifId: string, createObjektifDto: CreateObjektifDto): Promise<IObjektif> {
        const { nama, ...rest } = createObjektifDto;
        const updateFields: any = { ...rest };
    
        if (nama) {
            updateFields.nama = nama.replace(/\b\w/g, (char) => char.toUpperCase());
        }
    
        const existingObjektif = await this.objektifModel.findByIdAndUpdate(objektifId, updateFields, { new: true });
    
        if (!existingObjektif) {
            throw new NotFoundException(`Siswa #${objektifId} tidak tersedia!`);
        }
    
        await this.deleteCache(`003`);
        await this.deleteCache(`002`);
        await this.deleteCache(`002:${existingObjektif.id_projek}`);
        await this.deleteCache(`003:${existingObjektif.id}`);
        await this.deleteCache(`003:projek:${existingObjektif.id_projek}`);
    
        return existingObjektif;
    }
    

    async getAllObjek(): Promise<IObjektif[]> {
        const cachedData = await this.Redisclient.get('003');

        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const objekData = await this.objektifModel.find()
            if (!objekData || objekData.length == 0) {
                throw new NotFoundException('Data objek tidak ada!');
            }
            await this.Redisclient.setex('003', 3600, JSON.stringify(objekData));
            return objekData;
        }
    }

    async getObjek(objekId: string): Promise<IObjektif> {
        const cacheKey = `003:${objekId}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const existingObjek = await this.objektifModel.findById(objekId)
            if (!existingObjek) {
                throw new NotFoundException(`Projek dengan #${objekId} tidak tersedia`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(existingObjek));
            return existingObjek;
        }
    }

    async getObjekByProjekId(idProjek: string): Promise<IObjektif[]> {
        const cacheKey = `003:projek:${idProjek}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const objektif = await this.objektifModel.find({ id_projek: idProjek });
            if (!objektif || objektif.length === 0) {
                throw new NotFoundException(`Data objektif dengan id_projek #${idProjek} tidak ditemukan`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(objektif));
            return objektif;
        }
    }

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.objektifModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('003', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 003) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 003): ${error}`);
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

    async deleteFile(bucketName: string, objectName: string): Promise<void> {
        try {
            await this.minioClient.removeObject(bucketName, objectName);
            console.log(`File ${objectName} telah dihapus dari Minio`);
        } catch (error) {
            console.error(`Error saat menghapus file dari Minio: ${error}`);
            throw new Error('Terjadi kesalahan saat menghapus file dari Minio');
        }
    }

    async deleteObjektif(objekId: string): Promise<void> {
        const deletedObjek = await this.objektifModel.findByIdAndDelete(objekId);
        console.log(deletedObjek);
        
    
        if (!deletedObjek) {
            throw new NotFoundException(`Objektif dengan ID ${objekId} tidak tersedia!`);
        }
    
        const deletedKeyresults = await this.keyresultModel.find({ id_objek: objekId });
        console.log(deletedKeyresults);
        
    
        for (const deletedKeyresult of deletedKeyresults) {
            const deleteprogres = await this.progresModel.find({ id_keyresult: deletedKeyresult.id });
            console.log(deleteprogres);
            
    
            for (const progres of deleteprogres) {
                if (progres.file) {
                    await this.deleteFile('okr.progres', progres.file);
                }
            }
    
            // Menghapus keyresult berdasarkan id_objek
            await this.keyresultModel.deleteMany({ id_objek: objekId });
    
            // Menghapus progres berdasarkan id_keyresult
            await this.progresModel.deleteMany({ id_keyresult: deletedKeyresult.id });
    
            // Hapus file jika ada
            if (deletedKeyresult.file) {
                await this.deleteFile('okr.keyresult', deletedKeyresult.file);
            }
        }
    
        // Memeriksa apakah total current_value mencapai target_value
        const projek = deletedObjek.id_projek;
        const keyresults = await this.keyresultModel.find({ id_projek: projek });
        let totalCurrentValue = 0;
        let totalTargetValue = 0;
    
        keyresults.forEach(keyresult => {
            totalCurrentValue += keyresult.current_value;
            totalTargetValue += parseInt(keyresult.target_value);
        });

        const kondisi = totalCurrentValue >= totalTargetValue;
    
        if (kondisi) {
            // Jika totalCurrentValue >= totalTargetValue, ubah status objektif dan projek menjadi "Finish"
            const idprojek = deletedObjek.id_projek;
            const projek = await this.projekModel.findById(idprojek);
            if (projek) {
                projek.status = "Selesai";
                await projek.save();
            }
        } else {
            const idprojek = deletedObjek.id_projek;
            const projek = await this.projekModel.findById(idprojek);
            if (projek) {
                projek.status = "Progress";
                await projek.save();
            }
        }
        console.log(kondisi);
        
    
        await this.deleteCache(`004`);
        await this.deleteCache(`002`);
        await this.deleteCache(`003`);
        await this.deleteCache(`003:${deletedObjek.id}`);
        await this.deleteCache(`003:projek:${deletedObjek.id_projek}`);
        await this.deleteCache(`002:${deletedObjek.id_projek}`);
        await this.deleteCache(`004:${deletedObjek.id}`);
        await this.deleteCache(`004:projek:${deletedObjek.id_projek}`);
        await this.deleteCache(`004:objek:${deletedObjek.id}`);
    }
    
    
    

}
