import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Task{
    @Prop()
    nama: string;

    @Prop()
    deskripsi: string;

    @Prop()
    file: string;

    @Prop()
    link: string;

    @Prop()
    assign_to: string;

    @Prop()
    nama_profile: string;

    @Prop()
    foto_profile: string;

    @Prop()
    start_date: string;

    @Prop()
    end_date: string;

    @Prop()
    status: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    user: User;
}

export const TaskSchema = SchemaFactory.createForClass(Task)