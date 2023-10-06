import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjekDto } from 'src/dto/create.projek.dto';
import { IProjek } from 'src/interface/projek.interface';

@Injectable()
export class ProjekService {
    constructor(@InjectModel('Projek') private projekModel: Model<IProjek>){}

    //Create Projek
    async createProjek(createProjekDto: CreateProjekDto): Promise<IProjek>{
        const { nama, deskripsi, start_date, end_date } = createProjekDto;
        const existingProjek = await this.projekModel.findOne({ nama });
        if (existingProjek) {
            throw new Error('Projek dengan nama tersebut sudah ada');
        }
        const newProjek = new this.projekModel({
            nama,
            deskripsi,
            start_date,
            end_date,
            status: "Soon"
        });
        return newProjek.save(); 
    }

    //Update Projek
    async updateProjek(projekId: string, updateProjekDto: CreateProjekDto): Promise<IProjek> {
        const { nama, deskripsi, start_date, end_date, status } = updateProjekDto;
        const updatedProjek = await this.projekModel.findByIdAndUpdate(
            projekId,
            { $set: { nama, deskripsi, start_date, end_date, status } },
            { new: true }
        );
        if (!updatedProjek) {
            throw new NotFoundException(`Projek dengan ID ${projekId} tidak ditemukan!`);
        }
        return updatedProjek;
    }

    //Show all projek
    async getAllProjek():Promise<IProjek[]>{
        const projekData = await this.projekModel.find()
        if (!projekData || projekData.length == 0){
            throw new NotFoundException('Data projek tidak ada!');
        }
        return projekData;
    }
    
    //Delete Projek
    async deleteProjek(projekId: string):Promise<IProjek>{
        const deletedProjek = await this.projekModel.findByIdAndDelete(projekId)
        if (!deletedProjek) {
            throw new NotFoundException(`Projek dengan #${projekId} tidak tersedia!`);
        }
        return deletedProjek;
    }


}
