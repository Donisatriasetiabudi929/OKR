import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import mongoose from "mongoose";

@Schema({
    timestamps: true,
})

export class User {
    @Prop()
    name: string;

    @Prop()
    password: string;


    @Prop()
    role: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: User;
}

export const UserSchema = SchemaFactory.createForClass(User)