import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Progrestask{
    @Prop()
    id_task: string;

    @Prop()
    id_profile: string;

    @Prop()
    nama_profile: string;

    @Prop()
    foto_profile: string;

    @Prop()
    tanggal: string;

    @Prop()
    nama: string;

    @Prop()
    deskripsi: string;

    @Prop()
    file: string;

    @Prop()
    link: string;

    @Prop()
    status: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    user: User;
}

export const ProgrestaskSchema = SchemaFactory.createForClass(Progrestask)