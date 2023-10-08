import {Document} from 'mongoose'
export interface IProfile extends Document{
    readonly id_user: string;
    readonly email: string;
    readonly role: string;
    readonly nama: string;
    readonly divisi: string;
    readonly notelpon: string;
    readonly gender: string;
    readonly tanggal_lahir: string;
    readonly foto: string;
    readonly bio: string;
    readonly sosmed: string[];
    readonly grade: string;
}