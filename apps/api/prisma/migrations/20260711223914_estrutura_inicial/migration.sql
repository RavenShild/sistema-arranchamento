-- CreateTable
CREATE TABLE `subunidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sigla` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subunidades_sigla_key`(`sigla`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `militares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identidade_militar` VARCHAR(30) NOT NULL,
    `nome_completo` VARCHAR(160) NOT NULL,
    `nome_guerra` VARCHAR(80) NOT NULL,
    `posto_graduacao` VARCHAR(50) NOT NULL,
    `situacao` ENUM('ATIVO', 'AFASTADO', 'TRANSFERIDO', 'RESERVA') NOT NULL DEFAULT 'ATIVO',
    `subunidade_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `militares_identidade_militar_key`(`identidade_militar`),
    INDEX `militares_subunidade_id_idx`(`subunidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `militar_id` INTEGER NOT NULL,
    `email` VARCHAR(160) NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `primeiro_acesso` BOOLEAN NOT NULL DEFAULT true,
    `ultimo_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_militar_id_key`(`militar_id`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` ENUM('MILITAR', 'FURRIEL', 'APROVISIONAMENTO', 'SARGENTEANTE', 'ADMINISTRADOR') NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `descricao` VARCHAR(255) NULL,

    UNIQUE INDEX `perfis_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(100) NOT NULL,
    `descricao` VARCHAR(255) NULL,

    UNIQUE INDEX `permissoes_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_perfis` (
    `usuario_id` INTEGER NOT NULL,
    `perfil_id` INTEGER NOT NULL,

    PRIMARY KEY (`usuario_id`, `perfil_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfil_permissoes` (
    `perfil_id` INTEGER NOT NULL,
    `permissao_id` INTEGER NOT NULL,

    PRIMARY KEY (`perfil_id`, `permissao_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `militares` ADD CONSTRAINT `militares_subunidade_id_fkey` FOREIGN KEY (`subunidade_id`) REFERENCES `subunidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_militar_id_fkey` FOREIGN KEY (`militar_id`) REFERENCES `militares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_perfis` ADD CONSTRAINT `usuario_perfis_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_perfis` ADD CONSTRAINT `usuario_perfis_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `perfis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perfil_permissoes` ADD CONSTRAINT `perfil_permissoes_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `perfis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perfil_permissoes` ADD CONSTRAINT `perfil_permissoes_permissao_id_fkey` FOREIGN KEY (`permissao_id`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
