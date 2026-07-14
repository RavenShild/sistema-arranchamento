-- CreateTable
CREATE TABLE `auditorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `acao` VARCHAR(20) NOT NULL,
    `recurso` VARCHAR(80) NOT NULL,
    `recurso_id` VARCHAR(80) NULL,
    `metodo` VARCHAR(10) NOT NULL,
    `rota` VARCHAR(255) NOT NULL,
    `status_http` INTEGER NOT NULL,
    `dados` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auditorias_created_at_idx`(`created_at`),
    INDEX `auditorias_usuario_id_created_at_idx`(`usuario_id`, `created_at`),
    INDEX `auditorias_recurso_created_at_idx`(`recurso`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
