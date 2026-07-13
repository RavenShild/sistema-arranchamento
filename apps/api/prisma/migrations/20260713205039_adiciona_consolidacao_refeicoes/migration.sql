-- CreateTable
CREATE TABLE `consolidados_refeicoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodo_id` INTEGER NOT NULL,
    `subunidade_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `refeicao` ENUM('CAFE', 'ALMOCO', 'JANTA', 'CEIA') NOT NULL,
    `quantidade` INTEGER NOT NULL,
    `quantidade_individual` INTEGER NOT NULL,
    `quantidade_gu` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consolidados_refeicoes_periodo_id_data_refeicao_idx`(`periodo_id`, `data`, `refeicao`),
    INDEX `consolidados_refeicoes_subunidade_id_idx`(`subunidade_id`),
    UNIQUE INDEX `consolidados_refeicoes_periodo_id_subunidade_id_data_refeica_key`(`periodo_id`, `subunidade_id`, `data`, `refeicao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consolidados_refeicoes` ADD CONSTRAINT `consolidados_refeicoes_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodos_arranchamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidados_refeicoes` ADD CONSTRAINT `consolidados_refeicoes_subunidade_id_fkey` FOREIGN KEY (`subunidade_id`) REFERENCES `subunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
