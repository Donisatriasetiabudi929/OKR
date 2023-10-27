import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Projek {
    @Prop()
    nama: string;

    @Prop()
    deskripsi: string;

    @Prop()
    start_date: string;

    @Prop()
    end_date: string;

    @Prop([String])
    team: string;

    @Prop()
    status: string;


    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: User;
}

export const ProjekSchema = SchemaFactory.createForClass(Projek)