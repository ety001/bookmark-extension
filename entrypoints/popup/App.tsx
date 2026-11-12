import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useToast } from '../../components/ui/use-toast';
import { getMessage } from '../../utils/i18n';

interface FormData {
  status: boolean;
  mini: boolean;
  random: boolean;
  frequency: number;
  currentNotifyLocation: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  ga: boolean;
  gaPrompted: boolean;
  autoClose: boolean;
  autoCloseDelay: number;
}

const notifyLocations = [
  { name: 'top_right', val: 'top-right' as const },
  { name: 'top_left', val: 'top-left' as const },
  { name: 'bottom_right', val: 'bottom-right' as const },
  { name: 'bottom_left', val: 'bottom-left' as const },
];

export default function App() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [displayGaReminder, setDisplayGaReminder] = useState<'display' | 'hidden'>('display');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [frequencyInput, setFrequencyInput] = useState<string>('');
  const [autoCloseDelayInput, setAutoCloseDelayInput] = useState<string>('');
  const configFetchedRef = useRef(false);

  useEffect(() => {
    // 防止 React.StrictMode 在开发模式下重复调用
    if (configFetchedRef.current) return;
    configFetchedRef.current = true;

    // 获取配置
    chrome.runtime.sendMessage({ ctype: 'get_config', cdata: true }, response => {
      if (chrome.runtime.lastError) {
        console.error('Popup error:', chrome.runtime.lastError);
        // 设置默认值，避免一直 loading
        setFormData({
          status: true,
          mini: false,
          random: true,
          frequency: 5,
          currentNotifyLocation: 'top-right',
          ga: false,
          gaPrompted: false,
          autoClose: false,
          autoCloseDelay: 30,
        });
        setFrequencyInput('5');
        setAutoCloseDelayInput('30');
        return;
      }
      if (response && response.cdata) {
        const config = response.cdata;
        const frequency = config.frequency ?? 5;
        const autoCloseDelay = config.autoCloseDelay ?? 30;
        setFormData({
          status: config.status ?? true,
          mini: config.mini ?? false,
          random: config.random ?? true,
          frequency: frequency,
          currentNotifyLocation: config.currentNotifyLocation ?? 'top-right',
          ga: config.ga ?? false,
          gaPrompted: config.gaPrompted ?? false,
          autoClose: config.autoClose ?? false,
          autoCloseDelay: autoCloseDelay,
        });
        setFrequencyInput(frequency.toString());
        setAutoCloseDelayInput(autoCloseDelay.toString());
        setDisplayGaReminder(config.ga === true || config.gaPrompted === true ? 'hidden' : 'display');
      } else {
        // 如果没有响应，设置默认值
        setFormData({
          status: true,
          mini: false,
          random: true,
          frequency: 5,
          currentNotifyLocation: 'top-right',
          ga: false,
          gaPrompted: false,
          autoClose: false,
          autoCloseDelay: 30,
        });
        setFrequencyInput('5');
        setAutoCloseDelayInput('30');
      }
    });
  }, []);

  // 校验并同步输入框的值，返回可保存的完整配置；严格模式校验失败时提示并恢复输入框，返回 null
  // （save_config 必须发送完整 config：background 的 updateConfig 是浅合并，
  // 缺字段会被 undefined 覆盖，故 GA 允许/拒绝等持久化路径也统一走这里）
  // lenient 宽松模式（GA 征询屏专用：屏上没有可见输入框，严格模式的 toast 报错无处修正、
  // 返回 null 会让征询永远关不掉）：输入无效时不提示、不恢复输入框、不返回 null，
  // 静默回退用 base 的 frequency/autoCloseDelay 继续构造 config
  const buildValidatedConfig = (base: FormData, lenient: boolean = false): FormData | null => {
    const frequencyValue = parseInt(frequencyInput);
    const autoCloseDelayValue = parseInt(autoCloseDelayInput);

    // frequency 输入框仅在 status 与 mini 均开启时可见；status=false 或 mini=false 时
    // 输入框已隐藏，toast 报错无处修正，跳过校验直接沿用 base.frequency
    const frequencyInputVisible = base.status === true && base.mini === true;
    const frequencyInvalid = frequencyInputVisible && (!frequencyInput.trim() || !Number.isInteger(frequencyValue) || frequencyValue < 1);

    // 验证频率
    if (frequencyInvalid && !lenient) {
      toast({
        variant: 'warning',
        title: getMessage('save_failed'),
        description: getMessage('need_integer'),
      });
      // 恢复为当前值
      setFrequencyInput(base.frequency.toString());
      return null;
    }

    // autoCloseDelay 输入框仅在 status、mini、autoClose 均开启时可见；不可见时
    // 跳过校验直接沿用 base.autoCloseDelay（与 frequency 同款可见性门控）
    const delayInputVisible = base.status === true && base.mini === true && base.autoClose === true;
    const autoCloseDelayInvalid = delayInputVisible && (!autoCloseDelayInput.trim() || !Number.isInteger(autoCloseDelayValue) || autoCloseDelayValue < 1);

    if (autoCloseDelayInvalid && !lenient) {
      toast({
        variant: 'warning',
        title: getMessage('save_failed'),
        description: getMessage('need_integer'),
      });
      // 恢复为当前值
      setAutoCloseDelayInput(base.autoCloseDelay.toString());
      return null;
    }

    // 输入框不可见或输入无效（lenient 静默回退）时沿用 base 的值
    const effectiveFrequency = frequencyInputVisible && !frequencyInvalid ? frequencyValue : base.frequency;
    const effectiveAutoCloseDelay = delayInputVisible && !autoCloseDelayInvalid ? autoCloseDelayValue : base.autoCloseDelay;

    return {
      ...base,
      frequency: effectiveFrequency,
      ...(base.autoClose && { autoCloseDelay: effectiveAutoCloseDelay }),
    };
  };

  const handleSave = () => {
    if (!formData) return;

    // 在保存前，同步输入框的值并校验；保存即视为已完成 GA 征询，gaPrompted 落盘为 true
    const updatedFormData = buildValidatedConfig({ ...formData, gaPrompted: true });
    if (!updatedFormData) return;

    chrome.runtime.sendMessage({ ctype: 'save_config', cdata: updatedFormData }, response => {
      if (response && response.cdata) {
        // 更新 formData 状态
        setFormData(updatedFormData);
        toast({
          variant: 'success',
          title: getMessage('save_success'),
        });
        setDisplayGaReminder('hidden');
      }
    });
  };

  const handleEnableGa = () => {
    if (!formData) return;
    // 与保存同款校验+同步，避免把与输入框不同步的旧 formData 存盘；
    // 宽松模式：征询屏上没有可见输入框，严格模式会困住用户；gaPrompted 落盘为 true
    const newFormData = buildValidatedConfig({ ...formData, ga: true, gaPrompted: true }, true);
    if (!newFormData) return;
    setFormData(newFormData);
    chrome.runtime.sendMessage({ ctype: 'save_config', cdata: newFormData }, response => {
      if (response && response.cdata) {
        setDisplayGaReminder('hidden');
      }
    });
  };

  const handleCancelGa = () => {
    if (!formData) return;
    // 拒绝也要落盘（发送完整 config + gaPrompted 三态标记，区分"拒绝过"与"从未询问"），
    // 否则下次打开 popup 会再次弹出征询；宽松模式同 handleEnableGa
    const newFormData = buildValidatedConfig({ ...formData, ga: false, gaPrompted: true }, true);
    if (!newFormData) return;
    setFormData(newFormData);
    chrome.runtime.sendMessage({ ctype: 'save_config', cdata: newFormData }, response => {
      if (response && response.cdata) {
        setDisplayGaReminder('hidden');
      }
    });
  };

  const handleBlockManager = () => {
    const baseUrl = chrome.runtime.getURL('block-manager.html');
    window.open(baseUrl, '_blank', 'noopener,noreferrer');
  };

  const handleResetConfig = () => {
    setShowResetDialog(true);
  };

  const confirmResetConfig = () => {
    chrome.runtime.sendMessage({ ctype: 'reset_config', cdata: true }, response => {
      if (response && response.cdata) {
        // 重新获取配置
        chrome.runtime.sendMessage({ ctype: 'get_config', cdata: true }, response => {
          if (response && response.cdata) {
            const config = response.cdata;
            const frequency = config.frequency ?? 5;
            const autoCloseDelay = config.autoCloseDelay ?? 30;
            setFormData({
              status: config.status ?? true,
              mini: config.mini ?? false,
              random: config.random ?? true,
              frequency: frequency,
              currentNotifyLocation: config.currentNotifyLocation ?? 'top-right',
              ga: config.ga ?? false,
              gaPrompted: config.gaPrompted ?? false,
              autoClose: config.autoClose ?? false,
              autoCloseDelay: autoCloseDelay,
            });
            setFrequencyInput(frequency.toString());
            setAutoCloseDelayInput(autoCloseDelay.toString());
            setDisplayGaReminder(config.ga === true || config.gaPrompted === true ? 'hidden' : 'display');
          }
        });
        toast({
          variant: 'success',
          title: getMessage('reset_success'),
        });
        setShowResetDialog(false);
      }
    });
  };

  if (!formData) {
    return <div className="p-5 w-[400px]">Loading...</div>;
  }

  return (
    <div className="p-5 w-[400px] bg-bg-gray">
      {displayGaReminder === 'display' && (
        <div className="space-y-5">
          <h4 className="text-lg font-semibold">{getMessage('ga')}</h4>
          <div className="mb-5">
            <Alert variant="warning">
              <AlertTitle>{getMessage('privacy_policy')}</AlertTitle>
            </Alert>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="primary" onClick={handleEnableGa}>
              {getMessage('enable_btn')}
            </Button>
            <Button type="button" variant="warning" onClick={handleCancelGa}>
              {getMessage('disable_btn')}
            </Button>
          </div>
        </div>
      )}

      {displayGaReminder === 'hidden' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium w-[140px] text-left">{getMessage('switch')}</label>
            <Switch checked={formData.status} onCheckedChange={checked => setFormData({ ...formData, status: checked })} />
          </div>

          {formData.status && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium w-[140px] text-left">{getMessage('mini_mode')}</label>
                <Switch checked={formData.mini} onCheckedChange={checked => setFormData({ ...formData, mini: checked })} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium w-[140px] text-left">{getMessage('random_reminder')}</label>
                <Switch checked={formData.random} onCheckedChange={checked => setFormData({ ...formData, random: checked })} />
              </div>

              {formData.mini && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">{getMessage('frequency')}</label>
                    <Input
                      type="number"
                      value={frequencyInput}
                      onChange={e => {
                        const value = e.target.value;
                        setFrequencyInput(value);
                        // 只有在输入有效数字时才更新 formData
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setFormData({
                            ...formData,
                            frequency: numValue,
                          });
                        }
                      }}
                      onBlur={e => {
                        // 失去焦点时，如果为空或无效，恢复为当前值
                        const value = e.target.value.trim();
                        if (!value || isNaN(parseInt(value)) || parseInt(value) < 1) {
                          setFrequencyInput(formData.frequency.toString());
                        }
                      }}
                      className="w-[200px]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">{getMessage('notify_position')}</label>
                    <Select
                      value={formData.currentNotifyLocation}
                      onValueChange={(value: any) =>
                        setFormData({
                          ...formData,
                          currentNotifyLocation: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notifyLocations.map(item => (
                          <SelectItem key={item.val} value={item.val}>
                            {getMessage(item.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">{getMessage('auto_close')}</label>
                    <Switch checked={formData.autoClose} onCheckedChange={checked => setFormData({ ...formData, autoClose: checked })} />
                  </div>

                  {formData.autoClose && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium w-[140px] text-left">{getMessage('auto_close_delay')}</label>
                      <Input
                        type="number"
                        value={autoCloseDelayInput}
                        onChange={e => {
                          const value = e.target.value;
                          setAutoCloseDelayInput(value);
                          // 只有在输入有效数字时才更新 formData
                          const numValue = parseInt(value);
                          if (!isNaN(numValue) && numValue > 0) {
                            setFormData({
                              ...formData,
                              autoCloseDelay: numValue,
                            });
                          }
                        }}
                        onBlur={e => {
                          // 失去焦点时，如果为空或无效，恢复为当前值
                          const value = e.target.value.trim();
                          if (!value || isNaN(parseInt(value)) || parseInt(value) < 1) {
                            setAutoCloseDelayInput(formData.autoCloseDelay.toString());
                          }
                        }}
                        className="w-[200px]"
                        min="1"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ga-checkbox" checked={formData.ga} onChange={e => setFormData({ ...formData, ga: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="ga-checkbox" className="text-sm">
                    {getMessage('ga')}
                  </label>
                </div>
                <div className="mb-5">
                  <Alert variant="warning">
                    <AlertTitle>{getMessage('privacy_policy')}</AlertTitle>
                  </Alert>
                </div>
              </div>
            </>
          )}

          {/* 按钮区始终可见：status=false 时仍可保存关闭状态 / 管理屏蔽 / 重置 */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="primary" onClick={handleSave}>
              {getMessage('save')}
            </Button>
            <Button type="button" variant="warning" onClick={handleBlockManager}>
              {getMessage('block_manager')}
            </Button>
            <Button type="button" variant="outline" onClick={handleResetConfig}>
              {getMessage('reset_config')}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('reset_config_title')}</AlertDialogTitle>
            <AlertDialogDescription>{getMessage('reset_config_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetConfig}>{getMessage('confirm_btn')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
