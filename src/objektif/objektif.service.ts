import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateObjektifDto } from 'src/dto/create.objektif.dto';
import { IObjektif } from 'src/interface/objektif.interface';
import { Redis } from 'ioredis';
import { IProjek } from 'src/interface/projek.interface';


@Injectable()
export class ObjektifService {
    private readonly Redisclient: Redis;

    constructor(
        @InjectModel('Objektif') private objektifModel: Model<IObjektif>,
        @InjectModel('Projek') private projekModel: Model<IProjek>
    ) {
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            //Optional
            db: 1
        });
    }

    async createObjektif(createObjektifDto: CreateObjektifDto): Promise<IObjektif> {
        const { id_projek, nama } = createObjektifDto;
        const nama1 = nama.replace(/\b\w/g, (char) => char.toUpperCase());
        const existingObjektif = await this.objektifModel.findOne({ nama });
        if (existingObjektif) {
            throw new Error('Objektif dengan nama tersebut sudah ada');
        }

        const projek = await this.projekModel.findById(id_projek);
        if(!projek){
            throw new NotFoundException(`Projek dengan id ${id_projek} tidak ditemukan`);
        }
        if (projek.status === "Finish") {
            // Jika status projek adalah "Finish", maka ubah status keyresult menjadi "Progress"
            projek.status = "Progress"; // Ubah status projek menjadi "Progress"
            await projek.save(); // Simpan perubahan
        }

        const newObjektif = new this.objektifModel({
            id_projek,
            nama: nama1,
            status: "Progress"
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
        const updateFields: any = { ...rest }; // Salin semua bidang ke objek pembaruan
    
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

}
