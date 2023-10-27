import { Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors, Headers, Put, Res, Param, HttpStatus, NotFoundException, Get } from '@nestjs/common';
import { ProgrestaskService } from './progrestask.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateProgresTaskDto } from 'src/dto/create.progrestask.dto';
import { randomBytes } from 'crypto';

@Controller('progrestask')
export class ProgrestaskController {
    constructor(
        private readonly progrestaskService: ProgrestaskService,
        private readonly authService: AuthService,
    ) { }

    @Post()
    @UseInterceptors(FilesInterceptor('files'))
    async uploadFiles(
        @Headers() headers: Record<string, string>,
        @UploadedFiles() uploadedFiles: Express.Multer.File[],
        @Body() createProgresTaskDto: CreateProgresTaskDto,
    ): Promise<any> {
        try {
            const token = headers['authorization']?.split(' ')[1];
            if (!token) {
                return { message: 'Tidak ada token yang diberikan' };
            }

            const uniqueCode = randomBytes(5).toString('hex');

            let namaFiles = ["#"];

            if (uploadedFiles && uploadedFiles.length > 0) {
                const filesData = uploadedFiles.map((file, index) => {
                    const stream = require('stream');
                    const readableStream = new stream.PassThrough();
                    readableStream.end(file.buffer);

                    const objectName = `${uniqueCode}-${index}-${file.originalname}`;
                    return { objectName, readableStream, mimeType: file.mimetype };
                });

                namaFiles = filesData.map(fileData => fileData.objectName);

                await Promise.all(filesData.map(async (fileData) => {
                    try {
                        await this.progrestaskService.uploadFile('okr.progrestask', fileData.objectName, fileData.readableStream, fileData.mimeType);
                    } catch (error) {
                        console.error(`Error saat mengunggah file: ${error}`);
                        throw new Error('Terjadi kesalahan saat mengunggah file');
                    }
                }));
            }

            const { id_user } = await this.authService.getUserFromToken(token);

            if (!id_user) {
                return { message: 'id_user tidak valid' };
            }
            const profile = await this.progrestaskService.getProfileByIdAuth(id_user);

            if (!profile) {
                throw new Error(`Profile dengan ID ${id_user} tidak ditemukan!`);
            }

            const dataprofile = await this.progrestaskService.getProfileById(profile.id);

            if (!dataprofile) {
                throw new Error(`Profile dengan ID ${profile.id} tidak ditemukan!`);
            }

            const task = await this.progrestaskService.getTaskById(createProgresTaskDto.id_task);
            if (!task) {
                throw new Error(`task dengan ID ${createProgresTaskDto.id_task} tidak ditemukan`)
            }

            if (task.assign_to !== profile.id) {
                return { message: "Task ini bukan untuk anda! Silahkan kerjakan key result yang sesuai..." };
            }

            await this.progrestaskService.createUploud(
                createProgresTaskDto.id_task,
                profile.id,
                dataprofile.nama,
                dataprofile.foto,
                createProgresTaskDto.tanggal,
                createProgresTaskDto.note,
                namaFiles,
                createProgresTaskDto.link,
                createProgresTaskDto.status
            );

            return { message: 'Data berhasil dikirim' };
        } catch (error) {
            console.error(`Error saat mengunggah file: ${error}`);
            throw new Error('Terjadi kesalahan saat mengunggah file');
        }
    }

    @Put('/:id')
    @UseInterceptors(FilesInterceptor('files'))
    async updateProgrestask(
        @Res() response,
        @Headers() headers: Record<string, string>,
        @Param('id') progresttaskId: string,
        @Body() createProgresTaskDto: CreateProgresTaskDto,
        @UploadedFiles() uploadedFiles: Express.Multer.File[],
    ) {
        try {
            const token = headers['authorization']?.split(' ')[1];
            if (!token) {
                return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Token tidak valid' });
            }

            const progrestaskData = await this.progrestaskService.getProgresTaskById(progresttaskId);

            if (!progrestaskData) {
                throw new NotFoundException(`Data Progrestask dengan ID ${progresttaskId} tidak ditemukan`);
            }

            let namaFiles: string[] = progrestaskData.files;

            if (uploadedFiles && uploadedFiles.length > 0) {
                for (const fileName of progrestaskData.files) {
                    try {
                        await this.progrestaskService.deleteFile('okr.progrestask', fileName);
                    } catch (error) {
                        console.error(`Error saat menghapus file: ${error}`);
                    }
                }

                const uniqueCode = randomBytes(5).toString('hex');

                const filesData = uploadedFiles.map((file, index) => {
                    const stream = require('stream');
                    const readableStream = new stream.PassThrough();
                    readableStream.end(file.buffer);

                    const objectName = `${uniqueCode}-${index}-${file.originalname}`;
                    return { objectName, readableStream, mimeType: file.mimetype };
                });

                namaFiles = filesData.map(fileData => fileData.objectName);

                await Promise.all(filesData.map(async (fileData) => {
                    try {
                        await this.progrestaskService.uploadFile('okr.progrestask', fileData.objectName, fileData.readableStream, fileData.mimeType);
                    } catch (error) {
                        console.error(`Error saat mengunggah file: ${error}`);
                        throw new Error('Terjadi kesalahan saat mengunggah file');
                    }
                }));
            }

            const { id_user } = await this.authService.getUserFromToken(token);

            if (!id_user) {
                return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'id_user tidak valid' });
            }

            const profile = await this.progrestaskService.getProfileByIdAuth(id_user);

            if (!profile) {
                throw new NotFoundException(`Profile dengan ID ${id_user} tidak ditemukan!`);
            }

            const dataprofile = await this.progrestaskService.getProfileById(profile.id);

            if (!dataprofile) {
                throw new NotFoundException(`Profile dengan ID ${profile.id} tidak ditemukan!`);
            }

            const task = await this.progrestaskService.getProgresTaskById(progresttaskId);
            if (!task) {
                throw new NotFoundException(`Task dengan ID ${createProgresTaskDto.id_task} tidak ditemukan`);
            }

            if (task.id_profile !== profile.id) {
                return response.status(HttpStatus.UNAUTHORIZED).json({ message: "Anda tidak dapat mengedit task ini karena task ini bukan untuk anda...." });
            }

            const updateProgrestask = await this.progrestaskService.updateProgresTask(
                progresttaskId,
                createProgresTaskDto.note.replace(/\b\w/g, (char) => char.toUpperCase()),
                namaFiles,
                createProgresTaskDto.link
            );


            return response.status(HttpStatus.OK).json({
                message: 'Data Progrestask berhasil diperbarui',
                updateProgrestask
            });
        } catch (err) {
            return response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat memperbarui data Progrestask'
            });
        }
    }

    @Put('/acc/:id_progrestask/approve')
    @UseGuards(AuthGuard())
    async approveProgres(
        @Param('id_progrestask') id_progrestask: string,
    ): Promise<any> {
        try {
            const updatedProgres = await this.progrestaskService.approveProgresTask(id_progrestask);
            return { message: 'progrestask berhasil diapprove', updatedProgres };
        } catch (error) {
            console.error(`Error saat mengapprove progres: ${error}`);
            throw new Error('Terjadi kesalahan saat mengapprove progres');
        }
    }

    @Put('/cancel/:id_progrestask/Reject')
    @UseGuards(AuthGuard())
    async rejectProgres(
        @Param('id_progrestask') id_progrestask: string,
    ): Promise<any> {
        try {
            const updatedProgres = await this.progrestaskService.RejectProgresTask(id_progrestask);
            return { message: 'progrestask telah di reject', updatedProgres };
        } catch (error) {
            console.error(`Error saat mengreject progres: ${error}`);
            throw new Error('Terjadi kesalahan saat mengreject progres');
        }
    }

    @Get('/status/pending')
    async getAllPendingProgrestask(@Res() Response) {
        try {
            const pendingprogrestask = await this.progrestaskService.getAllpendingProgrestaskTask();

            if (!pendingprogrestask) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Tidak ada data Progres task dengan status \'Pending\' ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres task dengan status \'Pending\' berhasil ditemukan',
                pendingprogrestask
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres task dengan status \'Pending\''
            });
        }
    }

    @Get('/task/:id_task')
    async getProgresTaskByIdTask(@Param('id_task') idtask: string, @Res() Response) {
        try {
            const progresTask = await this.progrestaskService.getProgrestaskByIdTask(idtask);

            if (!progresTask) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data Progres task tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Progres task berhasil ditemukan',
                progresTask
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Progres task'
            });
        }
    }

    @Get('/getdata/:id')
    async getProgresTaskById(@Param('id') id: string, @Res() Response) {
        try {
            const progrestask = await this.progrestaskService.getProgresTask(id);

            if (!progrestask) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data progres task tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data progres task berhasil ditemukan',
                progrestask
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data progres task'
            });
        }
    }
}
