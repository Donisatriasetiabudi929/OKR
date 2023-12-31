import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Keyresult {
    @Prop()
    id_projek: string;

    @Prop()
    id_objek: string;

    @Prop()
    nama: string;

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
    target_value: string;

    @Prop()
    days: string;

    @Prop()
    current_value: number;

    @Prop()
    status: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: User;
}

export const KeyresultSchema = SchemaFactory.createForClass(Keyresult)