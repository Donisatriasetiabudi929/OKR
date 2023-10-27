import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { KeyresultService } from './keyresult.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateKeyresultDto } from 'src/dto/create.keyresult.dto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { AuthGuard } from '@nestjs/passport';

@Controller('keyresult')
export class KeyresultController {

    constructor(
        private readonly keyresultService: KeyresultService) { }

    @Post()
    @UseGuards(AuthGuard())
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() uploadedFile: Express.Multer.File,
        @Body() createKeyresultDto: CreateKeyresultDto,
    ): Promise<any> {
        try {
            let file = '#';

            if (uploadedFile) {
                const uniqueCode = randomBytes(10).toString('hex');
                const objectName = `${uniqueCode}-${uploadedFile.originalname}`;

                const readableStream = new Readable();
                readableStream.push(uploadedFile.buffer);
                readableStream.push(null);

                await this.keyresultService.uploadFile('okr.keyresult', objectName, readableStream, uploadedFile.mimetype);

                file = objectName;
            }

            const {
                id_objek,
                nama,
                link,
                assign_to,
                target_value,
                days,
                current_value,
                status
            } = createKeyresultDto;

            const profile = await this.keyresultService.getProfileById(assign_to);

            if (!profile) {
                throw new Error(`Profile dengan ID ${assign_to} tidak ditemukan!`);
            }

            const objektif = await this.keyresultService.getObjekById(id_objek);
            if (!objektif) {
                throw new Error(`Objektif dengan ID ${id_objek} tidak ditemukan`)
            }

            const newKeyresult = await this.keyresultService.createKeyresult({
                id_projek: objektif.id_projek,
                id_objek,
                nama,
                file,
                link,
                assign_to,
                nama_profile: profile.nama,
                foto_profile: profile.foto,
                target_value,
                days,
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
    @UseGuards(AuthGuard())
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
                days,
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
            } else {
                const existingKeyresult = await this.keyresultService.getKeyresultById(keyresultId);

                if (existingKeyresult) {
                    nama_profile = existingKeyresult.nama_profile;
                    foto_profile = existingKeyresult.foto_profile;
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
                days,
                current_value,
                status
            );

            updatedResult.nama = updatedResult.nama.replace(/\b\w/g, (char) => char.toUpperCase());

            return { message: 'Data berhasil diperbarui', updatedResult };
        } catch (error) {
            console.error(`Error saat memperbarui data keyresult: ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui data keyresult');
        }
    }


    @Get('/projek/:id_projek/values')
    async getKeyresultValuesByProjekId(@Param('id_projek') idProjek: string, @Res() Response) {
        try {
            const keyresults = await this.keyresultService.getKeyresultsByProjekId(idProjek);

            if (!keyresults) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data keyresult tidak ditemukan'
                });
            }

            let totalTargetValue = 0;
            let totalCurrentValue = 0;

            keyresults.forEach(keyresult => {
                totalTargetValue += parseInt(keyresult.target_value);
                totalCurrentValue += Number(keyresult.current_value);
            });

            return Response.status(HttpStatus.OK).json({
                message: 'Total target_value dan current_value berhasil dihitung',
                totalTargetValue,
                totalCurrentValue
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat menghitung total target_value dan current_value'
            });
        }
    }


    @Get()
    async getProjeks(@Res() Response) {
        try {
            const keyresultData = await this.keyresultService.getAllKeyresult();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data keyresult berhasil ditemukan', keyresultData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/:id')
    async getProjekById(@Param('id') id: string, @Res() Response) {
        try {
            const keyresult = await this.keyresultService.getKeyresult(id);

            if (!keyresult) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data keyresult tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data keyresult berhasil ditemukan',
                keyresult
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data keyresult'
            });
        }
    }

    @Get('/projek/:id_projek')
    async getKeyresultsByProjekId(@Param('id_projek') idProjek: string, @Res() Response) {
        try {
            const keyresults = await this.keyresultService.getKeyresultsByProjekId(idProjek);

            if (!keyresults) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data keyresult tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data keyresult berhasil ditemukan',
                keyresults
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data keyresult'
            });
        }
    }

    @Get('/objek/:id_objek')
    async getKeyresultsByObjekId(@Param('id_objek') idObjek: string, @Res() Response) {
        try {
            const keyresults = await this.keyresultService.getKeyresultsByObjekId(idObjek);

            if (!keyresults) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data keyresult tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data keyresult berhasil ditemukan',
                keyresults
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data keyresult'
            });
        }
    }

    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteKeyresult(@Param('id') keyresultId: string, @Res() Response) {
        try {
            await this.keyresultService.deleteKeyresult(keyresultId);

            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data keyresult'
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat menghapus data keyresult'
            });
        }
    }

    @Get('/count/jumlah')
    async getKeyresultCount(@Res() Response) {
        try {
            const count = await this.keyresultService.getKeyresultCount();
            return Response.status(HttpStatus.OK).json({
                message: `Jumlah keyresult: ${count}`,
                count
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil jumlah keyresult'
            });
        }
    }

    @Get('/count/projek/:idProjek/progres')
    async getKeyresultCountByIdProjekAndStatus(@Param('idProjek') idProjek: string, @Res() Response) {
        try {
            const count = await this.keyresultService.getKeyresultCountByIdProjekAndStatus(idProjek);

            return Response.status(HttpStatus.OK).json({
                message: `Jumlah keyresult dengan status "Progres" untuk projek ID "${idProjek}": ${count}`,
                count
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil jumlah keyresult'
            });
        }
    }

    @Get('/count/projek/:idProjek/selesai')
    async getKeyresultCountByIdProjekAndStatusDoni(@Param('idProjek') idProjek: string, @Res() Response) {
        try {
            const count = await this.keyresultService.getKeyresultCountByIdProjekAndStatusDone(idProjek);

            return Response.status(HttpStatus.OK).json({
                message: `Jumlah keyresult dengan status "Selesai" untuk projek ID "${idProjek}": ${count}`,
                count
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil jumlah keyresult'
            });
        }
    }



}
