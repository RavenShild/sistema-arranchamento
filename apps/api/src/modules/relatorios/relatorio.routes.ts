import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import {
  periodoRelatorioIdSchema,
  relatorioDiarioParamsSchema,
  relatorioDiarioQuerySchema,
} from './relatorio.schema.js'
import {
  listarPeriodosParaRelatorio,
  listarSubunidadesParaRelatorio,
  obterEscopoRelatorio,
  obterRelatorioConsolidado,
  obterRelatorioDiario,
} from './relatorio.service.js'

export const relatorioRouter = Router()

relatorioRouter.use(authenticate)

async function resolverEscopo(
  usuarioId: number,
  permissoes: string[],
) {
  return obterEscopoRelatorio(usuarioId, permissoes)
}

relatorioRouter.get('/periodos', async (request, response) => {
  const escopo = await resolverEscopo(
    request.auth!.usuarioId,
    request.auth!.permissoes,
  )

  if (!escopo.sucesso) {
    return response.status(403).json({
      erro: 'Você não possui permissão para consultar relatórios.',
    })
  }

  const periodos = await listarPeriodosParaRelatorio()

  return response.status(200).json({
    periodos,
    escopo: escopo.global ? 'GLOBAL' : 'SUBUNIDADE',
  })
})

relatorioRouter.get('/subunidades', async (request, response) => {
  const escopo = await resolverEscopo(
    request.auth!.usuarioId,
    request.auth!.permissoes,
  )

  if (!escopo.sucesso) {
    return response.status(403).json({
      erro: 'Você não possui permissão para consultar relatórios.',
    })
  }

  const subunidades = await listarSubunidadesParaRelatorio(
    escopo.subunidadeId,
  )

  return response.status(200).json({
    subunidades,
    escopo: escopo.global ? 'GLOBAL' : 'SUBUNIDADE',
  })
})

relatorioRouter.get(
  '/periodos/:id/consolidado',
  async (request, response) => {
    const id = periodoRelatorioIdSchema.safeParse(request.params.id)

    if (!id.success) {
      return response.status(400).json({
        erro: 'Identificador inválido.',
      })
    }

    const escopo = await resolverEscopo(
      request.auth!.usuarioId,
      request.auth!.permissoes,
    )

    if (!escopo.sucesso) {
      return response.status(403).json({
        erro: 'Você não possui permissão para consultar relatórios.',
      })
    }

    const resultado = await obterRelatorioConsolidado(
      id.data,
      escopo.subunidadeId,
    )

    if (!resultado.sucesso) {
      if (resultado.motivo === 'PERIODO_NAO_ENCONTRADO') {
        return response.status(404).json({
          erro: 'Período não encontrado.',
        })
      }

      return response.status(409).json({
        erro: 'O período ainda não foi fechado.',
      })
    }

    return response.status(200).json({
      periodo: resultado.periodo,
      consolidados: resultado.consolidados,
      totaisPorData: resultado.totaisPorData,
      totalEtapas: resultado.totalEtapas,
      escopo: escopo.global ? 'GLOBAL' : 'SUBUNIDADE',
    })
  },
)

relatorioRouter.get(
  '/periodos/:id/dias/:data',
  async (request, response) => {
    const params = relatorioDiarioParamsSchema.safeParse(
      request.params,
    )
    const query = relatorioDiarioQuerySchema.safeParse(
      request.query,
    )

    if (!params.success || !query.success) {
      return response.status(400).json({
        erro: 'Período, data ou subunidade inválidos.',
      })
    }

    const escopo = await resolverEscopo(
      request.auth!.usuarioId,
      request.auth!.permissoes,
    )

    if (!escopo.sucesso) {
      return response.status(403).json({
        erro: 'Você não possui permissão para consultar relatórios.',
      })
    }

    const subunidadeId = escopo.global
      ? query.data.subunidadeId
      : escopo.subunidadeId

    const resultado = await obterRelatorioDiario(
      params.data.id,
      params.data.data,
      subunidadeId,
    )

    if (!resultado.sucesso) {
      if (resultado.motivo === 'PERIODO_NAO_ENCONTRADO') {
        return response.status(404).json({
          erro: 'Período não encontrado.',
        })
      }

      if (resultado.motivo === 'DATA_FORA_PERIODO') {
        return response.status(400).json({
          erro: 'A data não pertence ao período selecionado.',
        })
      }

      return response.status(409).json({
        erro: 'O período ainda não foi fechado.',
      })
    }

    return response.status(200).json({
      periodo: resultado.periodo,
      dia: resultado.dia,
      militares: resultado.militares,
      resumo: resultado.resumo,
      totalEtapas: resultado.totalEtapas,
      escopo: escopo.global ? 'GLOBAL' : 'SUBUNIDADE',
    })
  },
)