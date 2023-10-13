import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDivisiDto } from 'src/dto/create.divisi.dto';
import { IDivisi } from 'src/interface/divisi.interface';

@Injectable()
export class DivisiService {
    constructor(@InjectModel('Divisi') private divisiModel: Model<IDivisi>){

    }

    //Create divisi
    async createDivisi(createDivisiDto: CreateDivisiDto): Promise<IDivisi> {
        let { nama } = createDivisiDto;
    
        // Ubah setiap kata menjadi diawali huruf besar
        nama = nama.replace(/\b\w/g, (char) => char.toUpperCase());
    
        // Lakukan pengecekan apakah kategori dengan nama tersebut sudah ada
        const existingDivisi = await this.divisiModel.findOne({ nama });
    
        if (existingDivisi) {
            throw new Error('Divisi dengan nama tersebut sudah ada');
        }
    
        const newDivisi = await new this.divisiModel({ nama });
        return newDivisi.save();
    }
    
    
    //Show All divisi
    async getAllDivisi():Promise<IDivisi[]>{
        const divisiData = await this.divisiModel.find()
        if (!divisiData || divisiData.length == 0){
            throw new NotFoundException('Data divisi tidak ada!');
        }
        return divisiData;
    }

    //Delete divisi
    async deleteDivisi(divisiId: string):Promise<IDivisi>{
        const deletedDivisi = await this.divisiModel.findByIdAndDelete(divisiId)
        if (!deletedDivisi) {
            throw new NotFoundException(`Divisi dengan #${divisiId} tidak tersedia!`);
        }
        return deletedDivisi;
    }

}
