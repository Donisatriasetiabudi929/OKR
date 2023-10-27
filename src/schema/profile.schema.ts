import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Profile {
    @Prop()
    id_user: string;

    @Prop()
    email: string;

    @Prop()
    nama: string;

    @Prop()
    divisi: string;

    @Prop()
    notelpon: string;

    @Prop()
    gender: string;

    @Prop()
    tanggal_lahir: string;

    @Prop()
    foto: string;

    @Prop()
    bio: string;

    @Prop()
    sosmed: string[];

    @Prop()
    quote: string;

    @Prop()
    grade: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: User;

}

export const ProfileSchema = SchemaFactory.createForClass(Profile)