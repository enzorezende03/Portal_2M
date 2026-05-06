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
      avisos: {
        Row: {
          ativo: boolean
          created_at: string
          fim_em: string | null
          id: string
          inicio_em: string | null
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          mensagem: string
          tipo?: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      avisos_empresas: {
        Row: {
          aviso_id: string
          empresa_id: string
        }
        Insert: {
          aviso_id: string
          empresa_id: string
        }
        Update: {
          aviso_id?: string
          empresa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_empresas_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_treinamento: {
        Row: {
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cor_bg: string
          cor_navy: string
          cor_primary: string
          cor_soft: string
          cor_text: string
          created_at: string
          email_suporte: string | null
          fonte_corpo: string
          fonte_decorativa: string
          fonte_titulo: string
          id: string
          logo_url: string | null
          nome: string
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cor_bg?: string
          cor_navy?: string
          cor_primary?: string
          cor_soft?: string
          cor_text?: string
          created_at?: string
          email_suporte?: string | null
          fonte_corpo?: string
          fonte_decorativa?: string
          fonte_titulo?: string
          id?: string
          logo_url?: string | null
          nome: string
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cor_bg?: string
          cor_navy?: string
          cor_primary?: string
          cor_soft?: string
          cor_text?: string
          created_at?: string
          email_suporte?: string | null
          fonte_corpo?: string
          fonte_decorativa?: string
          fonte_titulo?: string
          id?: string
          logo_url?: string | null
          nome?: string
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ferramentas: {
        Row: {
          abre_em_nova_aba: boolean
          ativo: boolean
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          url_acesso: string
        }
        Insert: {
          abre_em_nova_aba?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          url_acesso: string
        }
        Update: {
          abre_em_nova_aba?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          url_acesso?: string
        }
        Relationships: []
      }
      ferramentas_empresas: {
        Row: {
          empresa_id: string
          ferramenta_id: string
        }
        Insert: {
          empresa_id: string
          ferramenta_id: string
        }
        Update: {
          empresa_id?: string
          ferramenta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_empresas_ferramenta_id_fkey"
            columns: ["ferramenta_id"]
            isOneToOne: false
            referencedRelation: "ferramentas"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_etapas: {
        Row: {
          ativo: boolean
          conteudo: Json
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          conteudo?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          conteudo?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      onboarding_etapas_empresas: {
        Row: {
          empresa_id: string
          etapa_id: string
        }
        Insert: {
          empresa_id: string
          etapa_id: string
        }
        Update: {
          empresa_id?: string
          etapa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_etapas_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_etapas_empresas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "onboarding_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progresso: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          etapa_id: string
          id: string
          respostas: Json | null
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          etapa_id: string
          id?: string
          respostas?: Json | null
          user_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          etapa_id?: string
          id?: string
          respostas?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progresso_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "onboarding_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_progresso: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          id: string
          segundos_assistidos: number
          treinamento_id: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          segundos_assistidos?: number
          treinamento_id: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          segundos_assistidos?: number
          treinamento_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_progresso_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          descricao: string | null
          duracao_segundos: number | null
          id: string
          ordem: number
          thumbnail_url: string | null
          titulo: string
          video_url: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          duracao_segundos?: number | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo: string
          video_url: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          duracao_segundos?: number | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_treinamento"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_empresas: {
        Row: {
          empresa_id: string
          treinamento_id: string
        }
        Insert: {
          empresa_id: string
          treinamento_id: string
        }
        Update: {
          empresa_id?: string
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_empresas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      current_empresa_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
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
      app_role: ["admin", "cliente"],
    },
  },
} as const
