import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { clientDto } from './application/dto/client.dto';
import { clientServices } from './application/use-case/cliente.use-case';

@Controller('cliente')
export class ClienteController {
  constructor(private clientServices: clientServices) {}

  @Get('/')
  async getAllClient() {
    const response = await this.clientServices.getAllClient();

    return response;
  }

    @Get('/:id')
  async getOneClient(@Param('id') id: string) {
    const response = await this.clientServices.getOneClient(id);

    return response;
  }

  @Post('/')
  async postHello(@Body() dto: clientDto) {
    return this.clientServices.createClient(dto);
  }

  @Put('/update/:id')
  async updateClient(@Param('id') id: string, @Body() dto: clientDto) {
    return this.clientServices.updateClient(id, dto);
  }

  @Delete('/delete/:id')
  async deleteClient(@Param('id') id: string) {
    return this.clientServices.deleteClient(id);
  }
}
