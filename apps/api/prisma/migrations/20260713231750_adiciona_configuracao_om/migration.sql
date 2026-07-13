-- CreateTable
CREATE TABLE `configuracao_om` (
    `id` INTEGER NOT NULL,
    `nome` VARCHAR(160) NOT NULL,
    `sigla` VARCHAR(30) NOT NULL,
    `posto_comandante` VARCHAR(50) NOT NULL,
    `nome_comandante` VARCHAR(160) NOT NULL,
    `atualizado_por_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `configuracao_om` ADD CONSTRAINT `configuracao_om_atualizado_por_id_fkey` FOREIGN KEY (`atualizado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
