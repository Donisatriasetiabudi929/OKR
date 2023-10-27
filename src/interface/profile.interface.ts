import { Document } from 'mongoose'
export interface IProfile extends Document {
    readonly id_user: string;
    readonly email: string;
    nama: string;
    readonly divisi: string;
    readonly notelpon: string;
    readonly gender: string;
    readonly tanggal_lahir: string;
    readonly foto: string;
    bio: string;
    readonly sosmed: string[];
    quote: string;
    readonly grade: string;
}