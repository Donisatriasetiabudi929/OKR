import { Body, Controller, Post, UploadedFile, UseInterceptors, Headers, Put, Param, UseGuards, Res, Get, HttpStatus } from '@nestjs/common';
import { ProgresService } from './progres.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProgresDto } from 'src/dto/create.progres.dto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { AuthService } from 'src/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';


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

            if (keyresult.assign_to !== profile.id) {
                return { message: "Key result ini bukan untuk anda! Silahkan kerjakan key result yang sesuai..." };
            }

            const pendingProgres = await this.progresService.getPendingProgresByStatusAndKeyresult(id_keyresult);

            const totalPending = pendingProgres.reduce((acc, progres) => {
                return acc + progres.total;
            }, 0);

            const newTotal = Number(total) + Number(totalPending) + Number(keyresult.current_value);

            console.log(pendingProgres);
            console.log(newTotal);

            if (newTotal > parseInt(keyresult.target_value)) {
                return { message: "Total melebihi nilai target value karena masih terdapat data progres yang pending" };
            } else {
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
            }
        } catch (error) {
            console.error(`Error saat mengunggah file: ${error}`);
            throw new Error('Terjadi kesalahan saat mengunggah file');
        }
    }

    @Get('/:id')
    async getUserById(@Param('id') id: string, @Res() Response) {
        try {
            const user = await this.authService.getUser(id);

            if (!user) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data user tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data user berhasil ditemukan',
                user
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data user'
            });
        }
    }


    @Put('/acc/:id_progres/approve')
    @UseGuards(AuthGuard())
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


    @Get('/keyresult/:id_keyresult')
    async getKeyresultsByObjekId(@Param('id_keyresult') idKeyresult: string, @Res() Response) {
        try {
            const progres = await this.progresService.getProgresByIdKeyresult(idKeyresult);

            if (!progres) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data Progres tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres berhasil ditemukan',
                progres
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres'
            });
        }
    }

    @Get('/status/pending')
    async getAllPendingProgres(@Res() Response) {
        try {
            const pendingProgres = await this.progresService.getAllPendingProgres();

            if (!pendingProgres) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Tidak ada data Progres dengan status \'Pending\' ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres dengan status \'Pending\' berhasil ditemukan',
                pendingProgres
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres dengan status \'Pending\''
            });
        }
    }

    @Get('/status/approve')
    async getApprove(@Res() Response) {
        try {
            const approveProgres = await this.progresService.getAllApproveProgres();

            if (!approveProgres) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Tidak ada data Progres dengan status \'Approve\' ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres dengan status \'Approve\' berhasil ditemukan',
                approveProgres
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres dengan status \'Approve\''
            });
        }
    }

    @Put('/:id')
    @UseInterceptors(FileInterceptor('file'))
    async updateProgres(
        @Headers() headers: Record<string, string>,
        @Param('id') progresId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() createProgresDto: CreateProgresDto,
    ): Promise<any> {
        try {
            const token = headers['authorization']?.split(' ')[1];
            if (!token) {
                return { message: 'Tidak ada token yang diberikan' };
            }
            const {
                nama,
                link,
            } = createProgresDto;

            let updatedFile = null;

            if (file) {
                const uniqueCode = randomBytes(10).toString('hex');
                const objectName = `${uniqueCode}-${file.originalname}`;

                const readableStream = new Readable();
                readableStream.push(file.buffer);
                readableStream.push(null);

                await this.progresService.uploadFile('okr.progres', objectName, readableStream, file.mimetype);

                const existingProgres = await this.progresService.getProgresById(progresId);
                if (existingProgres && existingProgres.file) {
                    await this.progresService.deleteFile('okr.progres', existingProgres.file);
                }

                updatedFile = objectName;
            }

            const { id_user } = await this.authService.getUserFromToken(token);

            if (!id_user) {
                return { message: 'id_user tidak valid' };
            }
            const profile = await this.progresService.getProfileByIdAuth(id_user);

            if (!profile) {
                throw new Error(`Profile dengan ID ${profile.id} tidak ditemukan!`);
            }

            const dataprofile = await this.progresService.getProfileById(profile.id);

            if (!dataprofile) {
                throw new Error(`Profile dengan ID ${profile.id} tidak ditemukan!`);
            }

            const updateProgres = await this.progresService.updateProgres(
                progresId,
                nama,
                updatedFile,
                link
            );

            updateProgres.nama = updateProgres.nama.replace(/\b\w/g, (char) => char.toUpperCase());

            return { message: 'Data berhasil diperbarui', updateProgres };
        } catch (error) {
            console.error(`Error saat memperbarui data progres: ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui data progres');
        }
    }


}
