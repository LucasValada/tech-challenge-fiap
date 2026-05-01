export class Veiculo {
  constructor(
    public id: string,
    public clienteId: string,
    public placa: string,
    public marca: string,
    public modelo: string,
    public ano: number,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
