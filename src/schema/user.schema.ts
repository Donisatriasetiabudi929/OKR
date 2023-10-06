import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import mongoose from "mongoose";

@Schema({
    timestamps: true,
})

export class User{
    @Prop()//Properti atau untuk menyebutkan fieldnya
    name: string;

    @Prop()//Properti atau untuk menyebutkan fieldnya
    password: string;
    
    
    @Prop()//Properti atau untuk menyebutkan fieldnya
    role: string;

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    user: User;
}

export const UserSchema = SchemaFactory.createForClass(User)