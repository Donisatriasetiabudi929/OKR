import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose'
import mongoose from 'mongoose';
import { User } from './user.schema';

@Schema()
export class Objektif{

    @Prop()
    id_projek: string;

    @Prop()
    nama: string;

    @Prop()
    start_date: string;

    @Prop()
    end_date: string;

    @Prop()
    status: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    user: User;
}

export const ObjektifSchema = SchemaFactory.createForClass(Objektif)