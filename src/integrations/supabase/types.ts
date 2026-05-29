export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          nome: string
          prefix: string
          scopes: string[] | null
          usage_count: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          nome: string
          prefix: string
          scopes?: string[] | null
          usage_count?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          nome?: string
          prefix?: string
          scopes?: string[] | null
          usage_count?: number
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          categoria: string
          created_at: string
          id: string
          ip: string | null
          mensagem: string
          payload: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          ip?: string | null
          mensagem: string
          payload?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          ip?: string | null
          mensagem?: string
          payload?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          brasilnfe_company_token: string | null
          brasilnfe_environment: string | null
          brasilnfe_user_token: string | null
          brasilnfe_validated_at: string | null
          empresa_cnpj: string | null
          empresa_email: string | null
          empresa_endereco: string | null
          empresa_ie: string | null
          empresa_razao: string | null
          empresa_telefone: string | null
          id: string
          metodos_pagamento: Json
          nfe_provider: string | null
          nfeio_api_key: string | null
          nfeio_company_id: string | null
          nfeio_environment: string | null
          nfeio_validated_at: string | null
          nfeio_webhook_events: Json | null
          nfeio_webhook_secret: string | null
          pdv_ativo: boolean
          pix_chave: string | null
          pix_qr_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brasilnfe_company_token?: string | null
          brasilnfe_environment?: string | null
          brasilnfe_user_token?: string | null
          brasilnfe_validated_at?: string | null
          empresa_cnpj?: string | null
          empresa_email?: string | null
          empresa_endereco?: string | null
          empresa_ie?: string | null
          empresa_razao?: string | null
          empresa_telefone?: string | null
          id?: string
          metodos_pagamento?: Json
          nfe_provider?: string | null
          nfeio_api_key?: string | null
          nfeio_company_id?: string | null
          nfeio_environment?: string | null
          nfeio_validated_at?: string | null
          nfeio_webhook_events?: Json | null
          nfeio_webhook_secret?: string | null
          pdv_ativo?: boolean
          pix_chave?: string | null
          pix_qr_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brasilnfe_company_token?: string | null
          brasilnfe_environment?: string | null
          brasilnfe_user_token?: string | null
          brasilnfe_validated_at?: string | null
          empresa_cnpj?: string | null
          empresa_email?: string | null
          empresa_endereco?: string | null
          empresa_ie?: string | null
          empresa_razao?: string | null
          empresa_telefone?: string | null
          id?: string
          metodos_pagamento?: Json
          nfe_provider?: string | null
          nfeio_api_key?: string | null
          nfeio_company_id?: string | null
          nfeio_environment?: string | null
          nfeio_validated_at?: string | null
          nfeio_webhook_events?: Json | null
          nfeio_webhook_secret?: string | null
          pdv_ativo?: boolean
          pix_chave?: string | null
          pix_qr_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      backups_log: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          status: string
          storage_path: string | null
          tamanho_bytes: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          status?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          status?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      caixa_movimentos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          sessao_id: string
          tipo: Database["public"]["Enums"]["caixa_mov_tipo"]
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          sessao_id: string
          tipo: Database["public"]["Enums"]["caixa_mov_tipo"]
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          sessao_id?: string
          tipo?: Database["public"]["Enums"]["caixa_mov_tipo"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentos_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "caixa_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_sessoes: {
        Row: {
          abertura: string
          fechamento: string | null
          id: string
          observacoes: string | null
          operador_id: string
          status: Database["public"]["Enums"]["caixa_status"]
          valor_final: number | null
          valor_inicial: number
        }
        Insert: {
          abertura?: string
          fechamento?: string | null
          id?: string
          observacoes?: string | null
          operador_id: string
          status?: Database["public"]["Enums"]["caixa_status"]
          valor_final?: number | null
          valor_inicial?: number
        }
        Update: {
          abertura?: string
          fechamento?: string | null
          id?: string
          observacoes?: string | null
          operador_id?: string
          status?: Database["public"]["Enums"]["caixa_status"]
          valor_final?: number | null
          valor_inicial?: number
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          icone: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          endereco: Json | null
          id: string
          ie: string | null
          limite_credito: number | null
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          saldo_fiado: number
          telefone: string | null
          tipo_pessoa: string
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          ie?: string | null
          limite_credito?: number | null
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          saldo_fiado?: number
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          ie?: string | null
          limite_credito?: number | null
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          saldo_fiado?: number
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: []
      }
      contas: {
        Row: {
          anexo_url: string | null
          categoria: string | null
          cliente_id: string | null
          created_at: string
          descricao: string
          id: string
          status: Database["public"]["Enums"]["conta_status"]
          tipo: Database["public"]["Enums"]["conta_tipo"]
          valor: number
          vencimento: string
        }
        Insert: {
          anexo_url?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          status?: Database["public"]["Enums"]["conta_status"]
          tipo: Database["public"]["Enums"]["conta_tipo"]
          valor: number
          vencimento: string
        }
        Update: {
          anexo_url?: string | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          status?: Database["public"]["Enums"]["conta_status"]
          tipo?: Database["public"]["Enums"]["conta_tipo"]
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string
          id: string
          pago: boolean
          pago_em: string | null
          valor: number
          vencimento: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao: string
          id?: string
          pago?: boolean
          pago_em?: string | null
          valor: number
          vencimento?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string
          id?: string
          pago?: boolean
          pago_em?: string | null
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      estoque_movimentos: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          produto_id: string
          qtd: number
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["estoque_mov_tipo"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          produto_id: string
          qtd: number
          referencia_id?: string | null
          tipo: Database["public"]["Enums"]["estoque_mov_tipo"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          produto_id?: string
          qtd?: number
          referencia_id?: string | null
          tipo?: Database["public"]["Enums"]["estoque_mov_tipo"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_pedidos: {
        Row: {
          faturamento_id: string
          pedido_id: string
        }
        Insert: {
          faturamento_id: string
          pedido_id: string
        }
        Update: {
          faturamento_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_pedidos_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamentos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          numero: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero?: string
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero?: string
          total?: number
        }
        Relationships: []
      }
      fidelidade_pontos: {
        Row: {
          atualizado_em: string
          cliente_id: string
          pontos: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          pontos?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          pontos?: number
        }
        Relationships: [
          {
            foreignKeyName: "fidelidade_pontos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          condicoes: string | null
          contato_nome: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          ie: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          site: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicoes?: string | null
          contato_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicoes?: string | null
          contato_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      gtin_global: {
        Row: {
          categoria_sugerida: string | null
          created_at: string
          fonte: string | null
          gtin: string
          imagem_url: string | null
          marca: string | null
          nome: string
          unidade: string | null
        }
        Insert: {
          categoria_sugerida?: string | null
          created_at?: string
          fonte?: string | null
          gtin: string
          imagem_url?: string | null
          marca?: string | null
          nome: string
          unidade?: string | null
        }
        Update: {
          categoria_sugerida?: string | null
          created_at?: string
          fonte?: string | null
          gtin?: string
          imagem_url?: string | null
          marca?: string | null
          nome?: string
          unidade?: string | null
        }
        Relationships: []
      }
      nfe_entradas: {
        Row: {
          chave: string | null
          confirmado_em: string | null
          confirmado_por: string | null
          created_at: string
          fornecedor: string | null
          id: string
          numero: string | null
          status: Database["public"]["Enums"]["nfe_status"]
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          chave?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          fornecedor?: string | null
          id?: string
          numero?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          chave?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          fornecedor?: string | null
          id?: string
          numero?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: []
      }
      nfe_itens: {
        Row: {
          codigo_xml: string | null
          descricao_xml: string
          divergencia: string | null
          ean_xml: string | null
          id: string
          nfe_id: string
          produto_id: string | null
          qtd: number
          unidade: string | null
          valor_total: number
          valor_unit: number
        }
        Insert: {
          codigo_xml?: string | null
          descricao_xml: string
          divergencia?: string | null
          ean_xml?: string | null
          id?: string
          nfe_id: string
          produto_id?: string | null
          qtd?: number
          unidade?: string | null
          valor_total?: number
          valor_unit?: number
        }
        Update: {
          codigo_xml?: string | null
          descricao_xml?: string
          divergencia?: string | null
          ean_xml?: string | null
          id?: string
          nfe_id?: string
          produto_id?: string | null
          qtd?: number
          unidade?: string | null
          valor_total?: number
          valor_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_itens_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_webhook_events: {
        Row: {
          evento: string
          id: string
          payload: Json
          pedido_id: string | null
          recebido_em: string
        }
        Insert: {
          evento: string
          id?: string
          payload: Json
          pedido_id?: string | null
          recebido_em?: string
        }
        Update: {
          evento?: string
          id?: string
          payload?: Json
          pedido_id?: string | null
          recebido_em?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          lida_em: string | null
          mensagem: string
          payload: Json | null
          severidade: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          lida_em?: string | null
          mensagem: string
          payload?: Json | null
          severidade?: string
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          lida_em?: string | null
          mensagem?: string
          payload?: Json | null
          severidade?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patrimonio: {
        Row: {
          categoria: string | null
          created_at: string
          data_aquisicao: string | null
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_aquisicao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_aquisicao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          created_at: string
          desconto: number
          embalagem_tipo: string
          id: string
          pedido_id: string
          preco_unit: number
          produto_id: string
          qtd: number
          qtd_un_por_embalagem: number
          total: number
        }
        Insert: {
          created_at?: string
          desconto?: number
          embalagem_tipo?: string
          id?: string
          pedido_id: string
          preco_unit?: number
          produto_id: string
          qtd?: number
          qtd_un_por_embalagem?: number
          total?: number
        }
        Update: {
          created_at?: string
          desconto?: number
          embalagem_tipo?: string
          id?: string
          pedido_id?: string
          preco_unit?: number
          produto_id?: string
          qtd?: number
          qtd_un_por_embalagem?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_pagamentos: {
        Row: {
          condicao: string | null
          created_at: string
          created_by: string | null
          forma: string
          id: string
          observacao: string | null
          pedido_id: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          forma: string
          id?: string
          observacao?: string | null
          pedido_id: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          forma?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          created_at: string
          desconto: number
          faturado: boolean
          faturado_em: string | null
          fornecedor_id: string | null
          id: string
          nfe_chave: string | null
          nfe_emitida_em: string | null
          nfe_id: string | null
          nfe_numero: string | null
          nfe_pdf_url: string | null
          nfe_status: string | null
          nfe_xml_url: string | null
          numero: string
          observacoes: string | null
          operador_id: string | null
          origem: Database["public"]["Enums"]["pedido_origem"]
          pagamento: Database["public"]["Enums"]["pagamento_tipo"] | null
          restante: number
          status: Database["public"]["Enums"]["pedido_status"]
          subtotal: number
          tipo_operacao: string
          total: number
          total_pago: number
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          faturado?: boolean
          faturado_em?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_emitida_em?: string | null
          nfe_id?: string | null
          nfe_numero?: string | null
          nfe_pdf_url?: string | null
          nfe_status?: string | null
          nfe_xml_url?: string | null
          numero?: string
          observacoes?: string | null
          operador_id?: string | null
          origem?: Database["public"]["Enums"]["pedido_origem"]
          pagamento?: Database["public"]["Enums"]["pagamento_tipo"] | null
          restante?: number
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          tipo_operacao?: string
          total?: number
          total_pago?: number
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          faturado?: boolean
          faturado_em?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_emitida_em?: string | null
          nfe_id?: string | null
          nfe_numero?: string | null
          nfe_pdf_url?: string | null
          nfe_status?: string | null
          nfe_xml_url?: string | null
          numero?: string
          observacoes?: string | null
          operador_id?: string | null
          origem?: Database["public"]["Enums"]["pedido_origem"]
          pagamento?: Database["public"]["Enums"]["pagamento_tipo"] | null
          restante?: number
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          tipo_operacao?: string
          total?: number
          total_pago?: number
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
          nome_chave: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          nome_chave: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          nome_chave?: string
          url?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo_barras: string | null
          created_at: string
          embalagens: Json
          estoque: number
          estoque_fiscal: number
          estoque_minimo: number | null
          fator_unidade: number
          fornecedor_id: string | null
          id: string
          imagem_url: string | null
          nome: string
          peso_kg: number
          preco_custo: number | null
          preco_venda: number
          sku: string
          tem_nota_fiscal: boolean
          unidade: string
          unidade_embalagem: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          embalagens?: Json
          estoque?: number
          estoque_fiscal?: number
          estoque_minimo?: number | null
          fator_unidade?: number
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          peso_kg?: number
          preco_custo?: number | null
          preco_venda?: number
          sku: string
          tem_nota_fiscal?: boolean
          unidade?: string
          unidade_embalagem?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          embalagens?: Json
          estoque?: number
          estoque_fiscal?: number
          estoque_minimo?: number | null
          fator_unidade?: number
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          peso_kg?: number
          preco_custo?: number | null
          preco_venda?: number
          sku?: string
          tem_nota_fiscal?: boolean
          unidade?: string
          unidade_embalagem?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by_admin: string | null
          email: string | null
          id: string
          nome: string
          onboarding_completed_at: string | null
          telefone: string | null
          tenant_slug: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by_admin?: string | null
          email?: string | null
          id: string
          nome: string
          onboarding_completed_at?: string | null
          telefone?: string | null
          tenant_slug?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by_admin?: string | null
          email?: string | null
          id?: string
          nome?: string
          onboarding_completed_at?: string | null
          telefone?: string | null
          tenant_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string | null
          slug: string
          supabase_anon_key: string
          supabase_service_role_key: string | null
          supabase_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string | null
          slug: string
          supabase_anon_key: string
          supabase_service_role_key?: string | null
          supabase_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string | null
          slug?: string
          supabase_anon_key?: string
          supabase_service_role_key?: string | null
          supabase_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          allowed: boolean
          menu: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          menu: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          menu?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gerente" | "operador" | "vendedor"
      caixa_mov_tipo: "sangria" | "suprimento" | "venda" | "despesa"
      caixa_status: "aberto" | "fechado"
      conta_status: "pendente" | "pago" | "atrasado" | "cancelado"
      conta_tipo: "pagar" | "receber"
      estoque_mov_tipo: "entrada" | "saida" | "ajuste" | "perda"
      nfe_status: "importado" | "conferindo" | "confirmado"
      pagamento_tipo:
        | "pix"
        | "credito"
        | "debito"
        | "dinheiro"
        | "fiado"
        | "outro"
        | "nota_promissoria"
        | "cheque"
      pedido_origem: "balcao" | "pdv" | "vendedor" | "delivery"
      pedido_status:
        | "pendente"
        | "autorizado"
        | "separacao"
        | "conferencia"
        | "faturamento"
        | "concluido"
        | "cancelado"
        | "encerrado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "operador", "vendedor"],
      caixa_mov_tipo: ["sangria", "suprimento", "venda", "despesa"],
      caixa_status: ["aberto", "fechado"],
      conta_status: ["pendente", "pago", "atrasado", "cancelado"],
      conta_tipo: ["pagar", "receber"],
      estoque_mov_tipo: ["entrada", "saida", "ajuste", "perda"],
      nfe_status: ["importado", "conferindo", "confirmado"],
      pagamento_tipo: [
        "pix",
        "credito",
        "debito",
        "dinheiro",
        "fiado",
        "outro",
        "nota_promissoria",
        "cheque",
      ],
      pedido_origem: ["balcao", "pdv", "vendedor", "delivery"],
      pedido_status: [
        "pendente",
        "autorizado",
        "separacao",
        "conferencia",
        "faturamento",
        "concluido",
        "cancelado",
        "encerrado",
      ],
    },
  },
} as const
