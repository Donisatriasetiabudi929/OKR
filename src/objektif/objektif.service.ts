import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateObjektifDto } from 'src/dto/create.objektif.dto';
import { IObjektif } from 'src/interface/objektif.interface';

@Injectable()
export class ObjektifService {
    constructor(@InjectModel('Objektif') private objektifModel: Model<IObjektif>){}

    async createObjektif(createObjektifDto: CreateObjektifDto): Promise<IObjektif>{
        const { id_projek, nama } = createObjektifDto;
        const existingObjektif = await this.objektifModel.findOne({ nama });
        if (existingObjektif) {
            throw new Error('Objektif dengan nama tersebut sudah ada');
        }
    
        const newObjektif = new this.objektifModel({
            id_projek,
            nama,
            status: "Progress"
        });
    
        return newObjektif.save(); 
    }


    async updateObjektif(objektifId: string, createObjektifDto: CreateObjektifDto):Promise<IObjektif>{
        const existingObjektif = await this.objektifModel.findByIdAndUpdate(objektifId, createObjektifDto, {new: true});
        if (!existingObjektif) {
            throw new NotFoundException(`Siswa #${objektifId} tidak tersedia!`);
        }
        return existingObjektif;
    }

    async getAllObjek():Promise<IObjektif[]>{
        const objekData = await this.objektifModel.find()
        if (!objekData || objekData.length == 0){
            throw new NotFoundException('Data objek tidak ada!');
        }
        return objekData;
    }

    async getObjek(objekId:string):Promise<IObjektif>{
        const existingObjek = await this.objektifModel.findById(objekId)
        if (!existingObjek){
            throw new NotFoundException(`Projek dengan #${objekId} tidak tersedia`);
        }
        return existingObjek;
    }
}
