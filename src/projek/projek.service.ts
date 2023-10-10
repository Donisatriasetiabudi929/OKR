import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjekDto } from 'src/dto/create.projek.dto';
import { IProjek } from 'src/interface/projek.interface';
import { Redis } from 'ioredis';


@Injectable()
export class ProjekService {
    private readonly Redisclient: Redis;

    constructor(@InjectModel('Projek') private projekModel: Model<IProjek>){
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            //Optional
            db: 1
        });
    }

    //Create Projek
    async createProjek(createProjekDto: CreateProjekDto): Promise<IProjek>{
        const { nama, deskripsi, start_date, end_date, team } = createProjekDto;
    
        // Memeriksa apakah ada nilai yang sama dalam 'team'
        if (new Set(team).size !== team.length) {
            throw new Error('Data team tidak boleh sama');
        }
    
        const existingProjek = await this.projekModel.findOne({ nama });
        if (existingProjek) {
            throw new Error('Projek dengan nama tersebut sudah ada');
        }
    
        const newProjek = new this.projekModel({
            nama,
            deskripsi,
            start_date,
            end_date,
            team: team || [],  
            status: "On Progress"
        });
        await this.deleteCache(`002`);
        return newProjek.save(); 
    }
    
    
    

    //Update Projek
    async updateProjek(projekId: string, updateProjekDto: CreateProjekDto): Promise<IProjek> {
        const { nama, deskripsi, start_date, end_date, team,  status } = updateProjekDto;
        const updatedProjek = await this.projekModel.findByIdAndUpdate(
            projekId,
            { $set: { nama, deskripsi, start_date, end_date, team, status } },
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
    
    //Delete Projek
    async deleteProjek(projekId: string):Promise<IProjek>{
        const deletedProjek = await this.projekModel.findByIdAndDelete(projekId)
        if (!deletedProjek) {
            throw new NotFoundException(`Projek dengan #${projekId} tidak tersedia!`);
        }
        await this.updateCache();
        await this.deleteCache(`002:${deletedProjek.id}`);
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
