import { Body, Controller, Post, UploadedFile, UseInterceptors, Headers, Put, Param } from '@nestjs/common';
import { ProgresService } from './progres.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProgresDto } from 'src/dto/create.progres.dto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { AuthService } from 'src/auth/auth.service';


@Controller('progres')
export class ProgresController {
    constructor(
        private readonly progresService: ProgresService, private readonly authService: AuthService) { }

    
@Post()
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
    @Headers() headers: Record<string, string>,
    @UploadedFile() uploadedFile: Express.Multer.File,
    @Body() createProgresDto: CreateProgresDto,
): Promise<any> {
    try {
        const token = headers['authorization']?.split(' ')[1];
        if (!token) {
            return { message: 'Tidak ada token yang diberikan' };
        }
        let file = '#'; // Default value

        if (uploadedFile) {
            const uniqueCode = randomBytes(10).toString('hex');
            const objectName = `${uniqueCode}-${uploadedFile.originalname}`;

            const readableStream = new Readable();
            readableStream.push(uploadedFile.buffer);
            readableStream.push(null);

            await this.progresService.uploadFile('okr.progres', objectName, readableStream, uploadedFile.mimetype);

            file = objectName;
        }

        const {
            id_keyresult,
            id_profile,
            tanggal,
            nama,
            total,
            link,
            status
        } = createProgresDto;

        // Dapatkan id_user dari token
        const { id_user } = await this.authService.getUserFromToken(token);

        if (!id_user) {
            return { message: 'id_user tidak valid' };
        }
        const profile = await this.progresService.getProfileByIdAuth(id_user);

        if (!profile) {
            throw new Error(`Profile dengan ID ${id_profile} tidak ditemukan!`);
        }

        const dataprofile = await this.progresService.getProfileById(profile.id);

        if (!dataprofile) {
            throw new Error(`Profile dengan ID ${profile.id} tidak ditemukan!`);
        }

        const keyresult = await this.progresService.getKeyresultById(id_keyresult);
        if (!keyresult) {
            throw new Error(`Keyresult dengan ID ${id_keyresult} tidak ditemukan`)
        }

        // Periksa apakah profile.id dari token sama dengan assign_to di tabel key result
        if (keyresult.assign_to !== profile.id) {
            return { message: "Key result ini bukan untuk anda! Silahkan kerjakan key result yang sesuai..." }; // Mengembalikan pesan sesuai dengan kondisi
        }

        const newProgres = await this.progresService.createProgres({
            id_projek: keyresult.id_projek,
            id_objek: keyresult.id_objek,
            id_keyresult,
            id_profile: profile.id,
            nama_profile: dataprofile.nama,
            foto_profile: dataprofile.foto,
            tanggal,
            nama,
            total,
            file,
            link,
            status,
        });

        return { message: 'Data berhasil dikirim', newProgres };
    } catch (error) {
        console.error(`Error saat mengunggah file: ${error}`);
        throw new Error('Terjadi kesalahan saat mengunggah file');
    }
}

@Put('/:id_progres/approve')
async approveProgres(
    @Param('id_progres') id_progres: string,
): Promise<any> {
    try {
        const updatedProgres = await this.progresService.approveProgres(id_progres);

        return { message: 'Progres berhasil diapprove', updatedProgres };
    } catch (error) {
        console.error(`Error saat mengapprove progres: ${error}`);
        throw new Error('Terjadi kesalahan saat mengapprove progres');
    }
}




}
