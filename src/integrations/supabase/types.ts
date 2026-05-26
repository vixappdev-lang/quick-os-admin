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
          id: string
          key_hash: string
          last_used_at: string | null
          nome: string
          prefix: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          nome: string
          prefix: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          nome?: string
          prefix?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          empresa_cnpj: string | null
          empresa_email: string | null
          empresa_endereco: string | null
          empresa_razao: string | null
          empresa_telefone: string | null
          id: string
          metodos_pagamento: Json
          pdv_ativo: boolean
          pix_chave: string | null
          pix_qr_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          empresa_cnpj?: string | null
          empresa_email?: string | null
          empresa_endereco?: string | null
          empresa_razao?: string | null
          empresa_telefone?: string | null
          id?: string
          metodos_pagamento?: Json
          pdv_ativo?: boolean
          pix_chave?: string | null
          pix_qr_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          empresa_cnpj?: string | null
          empresa_email?: string | null
          empresa_endereco?: string | null
          empresa_razao?: string | null
          empresa_telefone?: string | null
          id?: string
          metodos_pagamento?: Json
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
      pedido_itens: {
        Row: {
          created_at: string
          desconto: number
          id: string
          pedido_id: string
          preco_unit: number
          produto_id: string
          qtd: number
          total: number
        }
        Insert: {
          created_at?: string
          desconto?: number
          id?: string
          pedido_id: string
          preco_unit?: number
          produto_id: string
          qtd?: number
          total?: number
        }
        Update: {
          created_at?: string
          desconto?: number
          id?: string
          pedido_id?: string
          preco_unit?: number
          produto_id?: string
          qtd?: number
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
      pedidos: {
        Row: {
          cliente_id: string | null
          created_at: string
          desconto: number
          id: string
          numero: string
          observacoes: string | null
          operador_id: string | null
          origem: Database["public"]["Enums"]["pedido_origem"]
          pagamento: Database["public"]["Enums"]["pagamento_tipo"] | null
          status: Database["public"]["Enums"]["pedido_status"]
          subtotal: number
          total: number
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          id?: string
          numero?: string
          observacoes?: string | null
          operador_id?: string | null
          origem?: Database["public"]["Enums"]["pedido_origem"]
          pagamento?: Database["public"]["Enums"]["pagamento_tipo"] | null
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          id?: string
          numero?: string
          observacoes?: string | null
          operador_id?: string | null
          origem?: Database["public"]["Enums"]["pedido_origem"]
          pagamento?: Database["public"]["Enums"]["pagamento_tipo"] | null
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          total?: number
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
          estoque: number
          estoque_minimo: number | null
          id: string
          imagem_url: string | null
          nome: string
          preco_custo: number | null
          preco_venda: number
          sku: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque?: number
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco_custo?: number | null
          preco_venda?: number
          sku: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque?: number
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_custo?: number | null
          preco_venda?: number
          sku?: string
          unidade?: string
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
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
      ],
    },
  },
} as const
