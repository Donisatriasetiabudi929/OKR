import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Profile{
    @Prop()//Properti atau untuk menyebutkan fieldnya
    id_user: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    email: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    nama: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    divisi: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    notelpon: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    gender: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    tanggal_lahir: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    foto: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    bio: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    sosmed: string[];

    @Prop()//Properti atau untuk menyebutkan fieldnya
    grade: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    user: User;

}

export const ProfileSchema = SchemaFactory.createForClass(Profile)