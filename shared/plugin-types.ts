// ---- plugin:voice_accounting_parser_1 ----
// ============================================================
// 插件 voice_accounting_parser_1 (语音记账解析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface VoiceAccountingParserOneInput {
  /** 用户输入的自然语言记账内容，如「昨天午饭58元」 */
  accounting_text: string;
}

/**
 * capabilityClient.load('voice_accounting_parser_1').call<VoiceAccountingParserOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { transaction_type, date, remark, ... } = result;
 */
export interface VoiceAccountingParserOneOutput {
  /** 收支类型，只能是「收入」或「支出」 */
  transaction_type: string;
  /** 记账日期，格式为YYYY-MM-DD */
  date: string;
  /** 记账备注信息，无则返回空字符串 */
  remark: string;
  /** 记账金额，单位为元，数字类型 */
  amount: number;
  /** 记账分类，如餐饮、交通、购物、工资等 */
  category: string;
}
// ---- end:voice_accounting_parser_1 ----

// ---- plugin:voice_accounting_parser_2 ----
// ============================================================
// 插件 voice_accounting_parser_2 (语音记账解析插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface VoiceAccountingParserTwoInput {
  /** 用户输入的自然语言记账内容，例如「昨天午饭58元」 */
  accounting_text: string;
}

/**
 * capabilityClient.load('voice_accounting_parser_2').call<VoiceAccountingParserTwoOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { amount, category, type, ... } = result;
 */
export interface VoiceAccountingParserTwoOutput {
  /** 记账金额，数字类型，单位为元 */
  amount: number;
  /** 记账分类，例如餐饮、交通、工资等 */
  category: string;
  /** 收支类型，只能是「支出」或「收入」 */
  type: string;
  /** 记账日期，格式为YYYY-MM-DD */
  date: string;
  /** 记账备注信息 */
  remark: string;
}
// ---- end:voice_accounting_parser_2 ----