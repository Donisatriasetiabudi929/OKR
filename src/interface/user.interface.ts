import { Document } from 'mongoose'
export interface IUser extends Document {
    readonly name: string;
    readonly password: string;
    readonly role: string;

    //Interface ini digunakan untuk menyebutkan field-field table yang akan dibuat

}