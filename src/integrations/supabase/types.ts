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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_items: {
        Row: {
          cliente: string
          cor_manual: string | null
          cot: string
          created_at: string
          custo: number
          data: string
          destino: string
          estacionamento: number | null
          fornecedor: string
          hora: string
          hora_extra: string | null
          hora_fim: string | null
          hora_in: string | null
          id: string
          km_extra: number | null
          km_fim: number | null
          km_in: number | null
          motorista: string
          observacoes: string | null
          origem: string
          outros: number | null
          outros_descricao: string | null
          outros_despesas: Json | null
          passageiros: Json
          pax: number
          placa: string
          receptivo: string
          status_faturamento: string | null
          telefone: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
          veiculo: string
        }
        Insert: {
          cliente: string
          cor_manual?: string | null
          cot: string
          created_at?: string
          custo: number
          data: string
          destino: string
          estacionamento?: number | null
          fornecedor: string
          hora: string
          hora_extra?: string | null
          hora_fim?: string | null
          hora_in?: string | null
          id?: string
          km_extra?: number | null
          km_fim?: number | null
          km_in?: number | null
          motorista: string
          observacoes?: string | null
          origem: string
          outros?: number | null
          outros_descricao?: string | null
          outros_despesas?: Json | null
          passageiros?: Json
          pax: number
          placa: string
          receptivo?: string
          status_faturamento?: string | null
          telefone: string
          tipo: string
          updated_at?: string
          user_id: string
          valor: number
          veiculo: string
        }
        Update: {
          cliente?: string
          cor_manual?: string | null
          cot?: string
          created_at?: string
          custo?: number
          data?: string
          destino?: string
          estacionamento?: number | null
          fornecedor?: string
          hora?: string
          hora_extra?: string | null
          hora_fim?: string | null
          hora_in?: string | null
          id?: string
          km_extra?: number | null
          km_fim?: number | null
          km_in?: number | null
          motorista?: string
          observacoes?: string | null
          origem?: string
          outros?: number | null
          outros_descricao?: string | null
          outros_despesas?: Json | null
          passageiros?: Json
          pax?: number
          placa?: string
          receptivo?: string
          status_faturamento?: string | null
          telefone?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
          veiculo?: string
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      centros_receita: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cep: string
          cidade: string
          cnpj_cpf: string
          created_at: string
          email: string
          endereco: string
          id: string
          nome: string
          telefone: string
          uf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string
          cidade?: string
          cnpj_cpf: string
          created_at?: string
          email: string
          endereco: string
          id?: string
          nome: string
          telefone: string
          uf?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string
          cidade?: string
          cnpj_cpf?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome?: string
          telefone?: string
          uf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          centro_custo: string | null
          created_at: string
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          descritivo: string
          fornecedor: string
          id: string
          placa: string
          status: string
          subgrupo_custo: string | null
          updated_at: string
          user_id: string
          valor: number
          valor_pago: number
          venda_id: string | null
        }
        Insert: {
          centro_custo?: string | null
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descritivo?: string
          fornecedor?: string
          id?: string
          placa?: string
          status?: string
          subgrupo_custo?: string | null
          updated_at?: string
          user_id: string
          valor?: number
          valor_pago?: number
          venda_id?: string | null
        }
        Update: {
          centro_custo?: string | null
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descritivo?: string
          fornecedor?: string
          id?: string
          placa?: string
          status?: string
          subgrupo_custo?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          valor_pago?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          centro_receita: string | null
          cliente: string
          created_at: string
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          descritivo: string
          id: string
          status: string
          subgrupo_receita: string | null
          updated_at: string
          user_id: string
          valor: number
          valor_pago: number
          venda_id: string | null
        }
        Insert: {
          centro_receita?: string | null
          cliente?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descritivo?: string
          id?: string
          status?: string
          subgrupo_receita?: string | null
          updated_at?: string
          user_id: string
          valor?: number
          valor_pago?: number
          venda_id?: string | null
        }
        Update: {
          centro_receita?: string | null
          cliente?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descritivo?: string
          id?: string
          status?: string
          subgrupo_receita?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          valor_pago?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_items: {
        Row: {
          cotacao_id: string
          created_at: string
          descritivo: string
          hora_extra: string | null
          id: string
          km_extra: number | null
          valor: number
        }
        Insert: {
          cotacao_id: string
          created_at?: string
          descritivo?: string
          hora_extra?: string | null
          id?: string
          km_extra?: number | null
          valor?: number
        }
        Update: {
          cotacao_id?: string
          created_at?: string
          descritivo?: string
          hora_extra?: string | null
          id?: string
          km_extra?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_items_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string
          data: string
          forma_pagamento: string
          id: string
          nome: string
          numero_cotacao: number
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
          validade_proposta: string | null
          valor_total: number
        }
        Insert: {
          created_at?: string
          data?: string
          forma_pagamento?: string
          id?: string
          nome: string
          numero_cotacao?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validade_proposta?: string | null
          valor_total?: number
        }
        Update: {
          created_at?: string
          data?: string
          forma_pagamento?: string
          id?: string
          nome?: string
          numero_cotacao?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validade_proposta?: string | null
          valor_total?: number
        }
        Relationships: []
      }
      editing_locks: {
        Row: {
          id: string
          item_id: string
          locked_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          locked_at?: string
          user_email?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          locked_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      fechamento_items: {
        Row: {
          agenda_item_id: string
          created_at: string
          fechamento_id: string
          id: string
        }
        Insert: {
          agenda_item_id: string
          created_at?: string
          fechamento_id: string
          id?: string
        }
        Update: {
          agenda_item_id?: string
          created_at?: string
          fechamento_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_items_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos: {
        Row: {
          cliente: string
          created_at: string
          data_emissao: string
          extras: Json
          extras_total: number
          id: string
          items: Json
          numero_fechamento: number
          observacoes: string | null
          quantidade_servicos: number
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          cliente: string
          created_at?: string
          data_emissao?: string
          extras?: Json
          extras_total?: number
          id?: string
          items?: Json
          numero_fechamento?: number
          observacoes?: string | null
          quantidade_servicos?: number
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          cliente?: string
          created_at?: string
          data_emissao?: string
          extras?: Json
          extras_total?: number
          id?: string
          items?: Json
          numero_fechamento?: number
          observacoes?: string | null
          quantidade_servicos?: number
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj: string
          contato: string
          created_at: string
          email: string
          id: string
          pix: string
          razao_social: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj: string
          contato: string
          created_at?: string
          email: string
          id?: string
          pix?: string
          razao_social: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string
          contato?: string
          created_at?: string
          email?: string
          id?: string
          pix?: string
          razao_social?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mobile_access_tokens: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          label: string
          last_used_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          token?: string
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          categoria: string
          cnh: string
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          cnh: string
          created_at?: string
          email: string
          id?: string
          nome: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          cnh?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subgrupos_custo: {
        Row: {
          centro_custo_id: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          centro_custo_id: string
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          centro_custo_id?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgrupos_custo_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      subgrupos_receita: {
        Row: {
          centro_receita_id: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          centro_receita_id: string
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          centro_receita_id?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgrupos_receita_centro_receita_id_fkey"
            columns: ["centro_receita_id"]
            isOneToOne: false
            referencedRelation: "centros_receita"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_servico: {
        Row: {
          created_at: string
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_view_financials: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_view_financials?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_view_financials?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano: number
          capacidade: number
          created_at: string
          id: string
          modelo: string
          placa: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: number
          capacidade: number
          created_at?: string
          id?: string
          modelo: string
          placa: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number
          capacidade?: number
          created_at?: string
          id?: string
          modelo?: string
          placa?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venda_extras: {
        Row: {
          created_at: string
          descricao: string
          id: string
          valor: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          valor?: number
          venda_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_extras_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_items: {
        Row: {
          agenda_item_id: string
          created_at: string
          id: string
          valor: number
          venda_id: string
        }
        Insert: {
          agenda_item_id: string
          created_at?: string
          id?: string
          valor?: number
          venda_id: string
        }
        Update: {
          agenda_item_id?: string
          created_at?: string
          id?: string
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_items_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cliente: string
          created_at: string
          data_vencimento: string | null
          data_venda: string
          forma_pagamento: string
          id: string
          numero_venda: number
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          cliente: string
          created_at?: string
          data_vencimento?: string | null
          data_venda?: string
          forma_pagamento?: string
          id?: string
          numero_venda?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          cliente?: string
          created_at?: string
          data_vencimento?: string | null
          data_venda?: string
          forma_pagamento?: string
          id?: string
          numero_venda?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_financials: { Args: { _user_id: string }; Returns: boolean }
      delete_user: { Args: { _user_id: string }; Returns: undefined }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
