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
}
