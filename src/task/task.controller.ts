import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { TaskService } from './task.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateTaskDto } from 'src/dto/create.task.dto';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';

@Controller('task')
export class TaskController {
    constructor(
        private readonly taskService: TaskService) { }

    @Post()
    @UseGuards(AuthGuard())
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() uploadedFile: Express.Multer.File,
        @Body() createTaskDto: CreateTaskDto,
    ): Promise<any> {
        try {
            let file = '#'; // Default value

            if (uploadedFile) {
                const uniqueCode = randomBytes(10).toString('hex');
                const objectName = `${uniqueCode}-${uploadedFile.originalname}`;

                const readableStream = new Readable();
                readableStream.push(uploadedFile.buffer);
                readableStream.push(null);

                await this.taskService.uploadFile('okr.task', objectName, readableStream, uploadedFile.mimetype);

                file = objectName;
            }

            const {
                nama,
                deskripsi,
                link,
                assign_to,
                nama_profile,
                foto_profile,
                start_date,
                end_date,
                status
            } = createTaskDto;

            const profile = await this.taskService.getProfileById(assign_to);

            if (!profile) {
                throw new Error(`Profile dengan ID ${assign_to} tidak ditemukan!`);
            }

            const newTask = await this.taskService.createTask({
                nama,
                deskripsi,
                file,
                link,
                assign_to,
                nama_profile: profile.nama,
                foto_profile: profile.foto,
                start_date,
                end_date,
                status
            });

            return { message: 'Data berhasil dikirim', newTask };
        } catch (error) {
            console.error(`Error saat mengunggah file: ${error}`);
            throw new Error('Terjadi kesalahan saat mengunggah file');
        }
    }

    @Put('/:id')
@UseGuards(AuthGuard())
@UseInterceptors(FileInterceptor('file'))
async updateTask(
    @Param('id') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateTaskDto: CreateTaskDto,
): Promise<any> {
    try {
        const {
            nama,
            deskripsi,
            link,
            assign_to,
            start_date,
            end_date,
            status
        } = updateTaskDto;

        let updatedFile = null;
        let nama_profile = null;
        let foto_profile = null;

        if (file) {
            const uniqueCode = randomBytes(10).toString('hex');
            const objectName = `${uniqueCode}-${file.originalname}`;

            const readableStream = new Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);

            await this.taskService.uploadFile('okr.task', objectName, readableStream, file.mimetype);

            const existingTask = await this.taskService.getTaskById(taskId);
            if (existingTask && existingTask.file) {
                await this.taskService.deleteFile('okr.task', existingTask.file);

                updatedFile = objectName;
            }
        }

        if (assign_to) {
            const profile = await this.taskService.getProfileById(assign_to);

            if (profile) {
                nama_profile = profile.nama;
                foto_profile = profile.foto;
            } else {
                throw new Error(`Profile dengan ID ${assign_to} tidak ditemukan!`);
            }
        } else {
            const existingTask = await this.taskService.getTaskById(taskId);

            if (existingTask) {
                nama_profile = existingTask.nama_profile;
                foto_profile = existingTask.foto_profile;
            }
        }

        const updateTask = await this.taskService.updateTask(
            taskId,
            nama,
            deskripsi,
            updatedFile,
            link,
            assign_to,
            nama_profile,
            foto_profile,
            start_date,
            end_date,
            status
        );

        updateTask.nama = updateTask.nama.replace(/\b\w/g, (char) => char.toUpperCase());
        updateTask.deskripsi = updateTask.deskripsi.replace(/\b\w/g, (char) => char.toUpperCase());

        return { message: 'Data berhasil diperbarui', updateTask };
    } catch (error) {
        console.error(`Error saat memperbarui data keyresult: ${error}`);
        throw new Error('Terjadi kesalahan saat memperbarui data keyresult');
    }
}

@Get()
    async getTask(@Res() Response){
        try{
            const taskData = await this.taskService.getAllTask();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data task berhasil ditemukan', taskData
            });
        }catch(err){
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/:id')
    async getTaskById(@Param('id') id: string, @Res() Response) {
        try {
            const task = await this.taskService.getTask(id);

            if (!task) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data task tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data task berhasil ditemukan',
                task
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data task'
            });
        }
    }

    @Get('/profile/:id_profile')
    async getTaskByIdProfile(@Param('id_profile') idProfile: string, @Res() Response) {
        try {
            const tasks = await this.taskService.getTaskByIdProfile(idProfile);

            if (!tasks) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data Task tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data Task berhasil ditemukan',
                tasks
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data Task'
            });
        }
    }


    @Delete('/:id')
@UseGuards(AuthGuard())
async deleteTask(@Param('id') taskId: string, @Res() Response) {
    try {
        // Hapus task berdasarkan ID
        await this.taskService.deleteTask(taskId);

        return Response.status(HttpStatus.OK).json({
            message: 'Berhasil hapus data task'
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat menghapus data task'
        });
    }
}


}
