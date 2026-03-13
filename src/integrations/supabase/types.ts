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
      clientes: {
        Row: {
          cnpj_cpf: string
          created_at: string
          email: string
          endereco: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj_cpf: string
          created_at?: string
          email: string
          endereco: string
          id?: string
          nome: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj_cpf?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
          user_id?: string
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
          id: string
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
          id?: string
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
          id?: string
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
