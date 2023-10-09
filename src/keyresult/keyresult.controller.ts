import { Body, Controller, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { KeyresultService } from './keyresult.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateKeyresultDto } from 'src/dto/create.keyresult.dto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';

@Controller('keyresult')
export class KeyresultController {

    constructor(
        private readonly keyresultService: KeyresultService) {}

        @Post()
        @UseInterceptors(FileInterceptor('file'))
        async uploadFile(
            @UploadedFile() uploadedFile: Express.Multer.File,
            @Body() createKeyresultDto: CreateKeyresultDto,
        ): Promise<any> {
            try {
                if (!uploadedFile) {
                    return { message: 'Tidak ada file yang diunggah' };
                }
    
                const uniqueCode = randomBytes(10).toString('hex');
                const objectName = `${uniqueCode}-${uploadedFile.originalname}`;
                
                const readableStream = new Readable();
                readableStream.push(uploadedFile.buffer);
                readableStream.push(null);
    
                const {
                    id_projek,
                    id_objek,
                    nama,
                    file,
                    link,
                    assign_to,
                    target_value,
                    current_value,
                    status
                } = createKeyresultDto;
    
                await this.keyresultService.uploadFile('okr.keyresult', objectName, readableStream, uploadedFile.mimetype);
    
                const profile = await this.keyresultService.getProfileById(assign_to);
    
                if (!profile) {
                    throw new Error(`Profile dengan ID ${assign_to} tidak ditemukan!`);
                }
    
                const newKeyresult = await this.keyresultService.createKeyresult({
                    id_projek,
                    id_objek,
                    nama,
                    file: objectName,
                    link,
                    assign_to,
                    nama_profile: profile.nama,
                    foto_profile: profile.foto,
                    target_value,
                    current_value,
                    status
                });
    
                return { message: 'Data berhasil dikirim', newKeyresult };
            } catch (error) {
                console.error(`Error saat mengunggah file: ${error}`);
                throw new Error('Terjadi kesalahan saat mengunggah file');
            }
        }

    @Put('/:id')
    @UseInterceptors(FileInterceptor('file'))
    async updateKeyresult(
        @Param('id') keyresultId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() updateKeyresultDto: CreateKeyresultDto,
    ): Promise<any> {
        try {
            const {
                id_projek,
                id_objek,
                nama,
                link,
                assign_to,
                target_value,
                current_value,
                status
            } = updateKeyresultDto;

            let updatedFile = null;
            let nama_profile = null;
            let foto_profile = null;

            if (file) {
                const uniqueCode = randomBytes(10).toString('hex');
                const objectName = `${uniqueCode}-${file.originalname}`;

                const readableStream = new Readable();
                readableStream.push(file.buffer);
                readableStream.push(null);

                await this.keyresultService.uploadFile('okr.keyresult', objectName, readableStream, file.mimetype);

                const existingKeyresult = await this.keyresultService.getKeyresultById(keyresultId);
                if (existingKeyresult && existingKeyresult.file) {
                    await this.keyresultService.deleteFile('okr.keyresult', existingKeyresult.file);
                }

                updatedFile = objectName;
            }

            if (assign_to) {
                const profile = await this.keyresultService.getProfileById(assign_to);

                if (profile) {
                    nama_profile = profile.nama;
                    foto_profile = profile.foto;
                } else {
                    throw new Error(`Profile dengan ID ${assign_to} tidak ditemukan!`);
                }
            }

            const updatedResult = await this.keyresultService.updateKeyresult(
                keyresultId,
                id_projek,
                id_objek,
                nama,
                updatedFile,
                link,
                assign_to,
                nama_profile,
                foto_profile,
                target_value,
                current_value,
                status
            );

            return { message: 'Data berhasil diperbarui', updatedResult };
        } catch (error) {
            console.error(`Error saat memperbarui data keyresult: ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui data keyresult');
        }
    }


        
}
