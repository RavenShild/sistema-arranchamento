/*
  Warnings:

  - The values [FERIAS] on the enum `militares_situacao` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `militares` MODIFY `situacao` ENUM('ATIVO', 'AFASTADO', 'TRANSFERIDO', 'RESERVA') NOT NULL DEFAULT 'ATIVO';

-- CreateTable
CREATE TABLE `periodos_arranchamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `status` ENUM('ABERTO', 'FECHADO') NOT NULL DEFAULT 'ABERTO',
    `aberto_por_id` INTEGER NOT NULL,
    `fechado_por_id` INTEGER NULL,
    `aberto_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechado_em` DATETIME(3) NULL,

    UNIQUE INDEX `periodos_arranchamento_data_inicio_key`(`data_inicio`),
    UNIQUE INDEX `periodos_arranchamento_data_fim_key`(`data_fim`),
    INDEX `periodos_arranchamento_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arranchamentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodo_id` INTEGER NOT NULL,
    `militar_id` INTEGER NOT NULL,
    `subunidade_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `refeicao` ENUM('CAFE', 'ALMOCO', 'JANTA', 'CEIA') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `arranchamentos_periodo_id_data_refeicao_idx`(`periodo_id`, `data`, `refeicao`),
    INDEX `arranchamentos_subunidade_id_idx`(`subunidade_id`),
    UNIQUE INDEX `arranchamentos_militar_id_data_refeicao_key`(`militar_id`, `data`, `refeicao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escalas_servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodo_id` INTEGER NOT NULL,
    `militar_id` INTEGER NOT NULL,
    `subunidade_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `cadastrado_por_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `escalas_servico_periodo_id_data_idx`(`periodo_id`, `data`),
    INDEX `escalas_servico_subunidade_id_idx`(`subunidade_id`),
    UNIQUE INDEX `escalas_servico_militar_id_data_key`(`militar_id`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ferias_militares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `militar_id` INTEGER NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `laranjeira` BOOLEAN NOT NULL DEFAULT false,
    `cadastrado_por_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ferias_militares_militar_id_data_inicio_data_fim_idx`(`militar_id`, `data_inicio`, `data_fim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feriados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATE NOT NULL,
    `descricao` VARCHAR(120) NOT NULL,
    `cadastrado_por_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `feriados_data_key`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `periodos_arranchamento` ADD CONSTRAINT `periodos_arranchamento_aberto_por_id_fkey` FOREIGN KEY (`aberto_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodos_arranchamento` ADD CONSTRAINT `periodos_arranchamento_fechado_por_id_fkey` FOREIGN KEY (`fechado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arranchamentos` ADD CONSTRAINT `arranchamentos_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodos_arranchamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arranchamentos` ADD CONSTRAINT `arranchamentos_militar_id_fkey` FOREIGN KEY (`militar_id`) REFERENCES `militares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arranchamentos` ADD CONSTRAINT `arranchamentos_subunidade_id_fkey` FOREIGN KEY (`subunidade_id`) REFERENCES `subunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalas_servico` ADD CONSTRAINT `escalas_servico_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodos_arranchamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalas_servico` ADD CONSTRAINT `escalas_servico_militar_id_fkey` FOREIGN KEY (`militar_id`) REFERENCES `militares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalas_servico` ADD CONSTRAINT `escalas_servico_subunidade_id_fkey` FOREIGN KEY (`subunidade_id`) REFERENCES `subunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `escalas_servico` ADD CONSTRAINT `escalas_servico_cadastrado_por_id_fkey` FOREIGN KEY (`cadastrado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias_militares` ADD CONSTRAINT `ferias_militares_militar_id_fkey` FOREIGN KEY (`militar_id`) REFERENCES `militares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ferias_militares` ADD CONSTRAINT `ferias_militares_cadastrado_por_id_fkey` FOREIGN KEY (`cadastrado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feriados` ADD CONSTRAINT `feriados_cadastrado_por_id_fkey` FOREIGN KEY (`cadastrado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
