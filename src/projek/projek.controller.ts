import { Body, Controller, Delete, Get, HttpStatus, NotFoundException, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateProjekDto } from 'src/dto/create.projek.dto';
import { ProjekService } from './projek.service';

@Controller('projek')
export class ProjekController {
    constructor(private readonly projekService: ProjekService){}

    //Create Projek endpoint
    @Post()
    @UseGuards(AuthGuard())
    async createProjek(@Res() Response, @Body() createProjekDto: CreateProjekDto){
        try {
            const newProjek = await this.projekService.createProjek(createProjekDto);
            return Response.status(HttpStatus.CREATED).json({
                message: "Berhasil menambahkan data projek", 
                newProjek
            });
        } catch (err) {
            if (err.message === 'Projek dengan nama tersebut sudah ada') {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error Project not created",
                    error: 'Projek dengan nama tersebut sudah ada'
                });
            } else {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error projek not created",
                    error: 'Bad request'
                });
            }
        }
    }

    //Show adll Projek
    @Get()
    async getProjeks(@Res() Response){
        try{
            const projekData = await this.projekService.getAllProjek();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data projek berhasil ditemukan', projekData
            });
        }catch(err){
            return Response.status(err.status).json(err.Response);
        }
    }

    //Update projek endpoint
    @Put(':id')
    @UseGuards(AuthGuard())
    async updateProjek(@Res() res, @Param('id') projekId: string, @Body() updateProjekDto: CreateProjekDto) {
        try {
            const updatedProjek = await this.projekService.updateProjek(projekId, updateProjekDto);

            return res.status(HttpStatus.OK).json({
                message: `Projek dengan ID ${projekId} berhasil diperbarui.`,
                updatedProjek,
            });
        } catch (err) {
            if (err instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: err.message,
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Gagal memperbarui projek.',
                });
            }
        }
    }

    //Delete projek endpoint
    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteProjek(@Res() Response, @Param('id') projekId: string){
        try{
            const deletedProjek = await this.projekService.deleteProjek(projekId)
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data Divisi',
                deletedProjek,
            });
        }catch(err){
            return Response.status(err.status).json(err.Response)
        }
    }

}
