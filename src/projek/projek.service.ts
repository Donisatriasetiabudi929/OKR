import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjekDto } from 'src/dto/create.projek.dto';
import { IProjek } from 'src/interface/projek.interface';
import { Redis } from 'ioredis';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { IObjektif } from 'src/interface/objektif.interface';
import { IKeyresult } from 'src/interface/keyresult.interface';
import { IProgres } from 'src/interface/progres.interface';


@Injectable()
export class ProjekService {
    private minioClient: Minio.Client;
    private readonly Redisclient: Redis;

    constructor(
        private configService: ConfigService, 
        @InjectModel('Projek') private projekModel: Model<IProjek>,
        @InjectModel('Objektif') private objektifModel: Model<IObjektif>,
        @InjectModel('Keyresult') private keyresultModel: Model<IKeyresult>,
        @InjectModel('Progres') private progresModel: Model<IProgres>,
        ){
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

    
    //Create Projek
    async createProjek(createProjekDto: CreateProjekDto): Promise<IProjek>{
        const { nama, deskripsi, start_date, end_date, team } = createProjekDto;
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());
        const desc = deskripsi.replace(/\b\w/g, (char) => char.toUpperCase());
        // Memeriksa apakah ada nilai yang sama dalam 'team'
        if (new Set(team).size !== team.length) {
            throw new Error('Data team tidak boleh sama');
        }
    
        const existingProjek = await this.projekModel.findOne({ nama });
        if (existingProjek) {
            throw new Error('Projek dengan nama tersebut sudah ada');
        }
    
        const newProjek = new this.projekModel({
            nama: nama1,
            deskripsi: desc,
            start_date,
            end_date,
            team: team || [],  
            status: "Progress"
        });
        await this.deleteCache(`002`);
        return newProjek.save(); 
    }
    
    //Update Projek
    async updateProjek(projekId: string, updateProjekDto: CreateProjekDto): Promise<IProjek> {
        const { nama, deskripsi, start_date, end_date, team,  status } = updateProjekDto;
        
        const updateFields: any = {}; // Objek untuk menyimpan bidang yang akan diperbarui
    
        if (nama) {
            updateFields.nama = nama.replace(/\b\w/g, char => char.toUpperCase());
        }
    
        if (deskripsi) {
            updateFields.deskripsi = deskripsi.replace(/\b\w/g, char => char.toUpperCase());;
        }
    
        if (start_date) {
            updateFields.start_date = start_date;
        }
    
        if (end_date) {
            updateFields.end_date = end_date;
        }
    
        if (team) {
            updateFields.team = team;
        }
    
        if (status) {
            updateFields.status = status;
        }
    
        const updatedProjek = await this.projekModel.findByIdAndUpdate(
            projekId,
            { $set: updateFields },
            { new: true }
        );
    
        if (!updatedProjek) {
            throw new NotFoundException(`Projek dengan ID ${projekId} tidak ditemukan!`);
        }
    
        await this.updateCache();
        await this.deleteCache(`002:${updatedProjek.id}`);
        return updatedProjek;
    }
    

    //Show all projek
    async getAllProjek():Promise<IProjek[]>{
        const cachedData = await this.Redisclient.get('002');

        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const projekData = await this.projekModel.find()
            if (!projekData || projekData.length == 0){
                throw new NotFoundException('Data projek tidak ada!');
            }
            await this.Redisclient.setex('002', 3600, JSON.stringify(projekData));
            return projekData;
        }
    }

    async getProjek(projekId:string):Promise<IProjek>{
        const cacheKey = `002:${projekId}`;
        const cachedData = await this.Redisclient.get(cacheKey);
        if (cachedData) {
            // Jika data tersedia di cache, parse data JSON dan kembalikan
            return JSON.parse(cachedData);
        } else {
            const existingProjek = await this.projekModel.findById(projekId)
            if (!existingProjek){
                throw new NotFoundException(`Projek dengan #${projekId} tidak tersedia`);
            }
            await this.Redisclient.setex(cacheKey, 3600, JSON.stringify(existingProjek)); 
            return existingProjek;
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
    //Delete Projek
    async deleteProjek(projekId: string): Promise<IProjek> {
        const deletedProjek = await this.projekModel.findByIdAndDelete(projekId);
    
        if (!deletedProjek) {
            throw new NotFoundException(`Projek dengan ID ${projekId} tidak tersedia!`);
        }
    
        const deletedObjek = await this.objektifModel.find({ id_projek: projekId });
    
        for (const objek of deletedObjek) {
            const deletedKeyresults = await this.keyresultModel.find({ id_objek: objek.id });
    
            for (const deletedKeyresult of deletedKeyresults) {
                const deleteProgres = await this.progresModel.find({ id_keyresult: deletedKeyresult.id });
    
                for (const progres of deleteProgres) {
                    if (progres.file) {
                        await this.deleteFile('okr.progres', progres.file);
                    }
                }
    
                // Menghapus keyresult berdasarkan id_objek
                await this.keyresultModel.deleteMany({ id_objek: objek.id });
    
                // Menghapus progres berdasarkan id_keyresult
                await this.progresModel.deleteMany({ id_keyresult: deletedKeyresult.id });
    
                // Hapus file jika ada
                if (deletedKeyresult.file) {
                    await this.deleteFile('okr.keyresult', deletedKeyresult.file);
                }
            }
            await this.deleteCache(`004`);
            await this.deleteCache(`002`);
            await this.deleteCache(`003`);
            await this.deleteCache(`003:${objek.id}`);
            await this.deleteCache(`003:projek:${deletedProjek.id}`);
            await this.deleteCache(`002:${deletedProjek.id}`);
            await this.deleteCache(`004:${objek.id}`);
            await this.deleteCache(`004:projek:${deletedProjek.id}}`);
            await this.deleteCache(`004:objek:${objek.id}`);
        }
    
        return deletedProjek;
        
    }
    

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.projekModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('002', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 002) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 002): ${error}`);
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
