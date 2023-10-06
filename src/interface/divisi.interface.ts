import {Document} from 'mongoose'
export interface IDivisi extends Document{
    readonly nama: string;
}