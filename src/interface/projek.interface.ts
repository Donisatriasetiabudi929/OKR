import {Document} from 'mongoose'
export interface IProjek extends Document{
    readonly nama: string;
    readonly deskripsi: string;
    readonly start_date: string;
    readonly end_date: string;
    readonly team: string[];
    readonly status: string;
}