import { count } from "console";
import { Cliente } from "./domain/entity/Client";
import { createClientDto } from "./application/dto/client.dto";

export interface ClientRepository {
    getOne(id: string): Promise<Cliente | null>

    getAllClient(): Promise<{client: Cliente[], count: number}>

    createClient(client: createClientDto): Promise<Cliente>

    getByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>

    updateClient(id, client: createClientDto): Promise<Cliente>

    deleteClient(id: string): Promise<void>
}