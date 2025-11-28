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
  const configFetchedRef = useRef(false);

  useEffect(() => {
    // 防止 React.StrictMode 在开发模式下重复调用
    if (configFetchedRef.current) return;
    configFetchedRef.current = true;

    // 获取配置
    chrome.runtime.sendMessage(
      { ctype: 'get_config', cdata: true },
      (response) => {
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
            autoClose: false,
            autoCloseDelay: 30,
          });
          return;
        }
        if (response && response.cdata) {
          const config = response.cdata;
          setFormData({
            status: config.status ?? true,
            mini: config.mini ?? false,
            random: config.random ?? true,
            frequency: config.frequency ?? 5,
            currentNotifyLocation: config.currentNotifyLocation ?? 'top-right',
            ga: config.ga ?? false,
            autoClose: config.autoClose ?? false,
            autoCloseDelay: config.autoCloseDelay ?? 30,
          });
          setDisplayGaReminder(config.ga === true ? 'hidden' : 'display');
        } else {
          // 如果没有响应，设置默认值
          setFormData({
            status: true,
            mini: false,
            random: true,
            frequency: 5,
            currentNotifyLocation: 'top-right',
            ga: false,
            autoClose: false,
            autoCloseDelay: 30,
          });
        }
      }
    );
  }, []);

  const handleSave = () => {
    if (!formData) return;

    // 验证
    if (formData.frequency && (!Number.isInteger(formData.frequency) || formData.frequency < 1)) {
      toast({
        variant: 'warning',
        title: getMessage('save_failed'),
        description: getMessage('need_integer'),
      });
      return;
    }

    // 验证自动关闭延迟
    if (formData.autoClose && (!Number.isInteger(formData.autoCloseDelay) || formData.autoCloseDelay < 1)) {
      toast({
        variant: 'warning',
        title: getMessage('save_failed'),
        description: getMessage('need_integer'),
      });
      return;
    }

    chrome.runtime.sendMessage(
      { ctype: 'save_config', cdata: formData },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('save_success'),
          });
          setDisplayGaReminder('hidden');
        }
      }
    );
  };

  const handleEnableGa = () => {
    if (!formData) return;
    const newFormData = { ...formData, ga: true };
    setFormData(newFormData);
    chrome.runtime.sendMessage(
      { ctype: 'save_config', cdata: newFormData },
      (response) => {
        if (response && response.cdata) {
          setDisplayGaReminder('hidden');
        }
      }
    );
  };

  const handleCancelGa = () => {
    setDisplayGaReminder('hidden');
  };

  const handleBlockManager = () => {
    const baseUrl = chrome.runtime.getURL('block-manager.html');
    window.open(baseUrl);
  };

  const handleResetConfig = () => {
    setShowResetDialog(true);
  };

  const confirmResetConfig = () => {
    chrome.runtime.sendMessage(
      { ctype: 'reset_config', cdata: true },
      (response) => {
        if (response && response.cdata) {
          // 重新获取配置
          chrome.runtime.sendMessage(
            { ctype: 'get_config', cdata: true },
            (response) => {
              if (response && response.cdata) {
                const config = response.cdata;
                setFormData({
                  status: config.status ?? true,
                  mini: config.mini ?? false,
                  random: config.random ?? true,
                  frequency: config.frequency ?? 5,
                  currentNotifyLocation: config.currentNotifyLocation ?? 'top-right',
                  ga: config.ga ?? false,
                  autoClose: config.autoClose ?? false,
                  autoCloseDelay: config.autoCloseDelay ?? 30,
                });
                setDisplayGaReminder(config.ga === true ? 'hidden' : 'display');
              }
            }
          );
          toast({
            variant: 'success',
            title: getMessage('reset_success'),
          });
          setShowResetDialog(false);
        }
      }
    );
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
            <label className="text-sm font-medium w-[140px] text-left">
              {getMessage('switch')}
            </label>
            <Switch
              checked={formData.status}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, status: checked })
              }
            />
          </div>

          {formData.status && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium w-[140px] text-left">
                  {getMessage('mini_mode')}
                </label>
                <Switch
                  checked={formData.mini}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, mini: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium w-[140px] text-left">
                  {getMessage('random_reminder')}
                </label>
                <Switch
                  checked={formData.random}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, random: checked })
                  }
                />
              </div>

              {formData.mini && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">
                      {getMessage('frequency')}
                    </label>
                    <Input
                      type="number"
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          frequency: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-[200px]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">
                      {getMessage('notify_position')}
                    </label>
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
                        {notifyLocations.map((item) => (
                          <SelectItem key={item.val} value={item.val}>
                            {getMessage(item.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium w-[140px] text-left">
                      {getMessage('auto_close')}
                    </label>
                    <Switch
                      checked={formData.autoClose}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, autoClose: checked })
                      }
                    />
                  </div>

                  {formData.autoClose && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium w-[140px] text-left">
                        {getMessage('auto_close_delay')}
                      </label>
                      <Input
                        type="number"
                        value={formData.autoCloseDelay}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            autoCloseDelay: parseInt(e.target.value) || 30,
                          })
                        }
                        className="w-[200px]"
                        min="1"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ga-checkbox"
                    checked={formData.ga}
                    onChange={(e) =>
                      setFormData({ ...formData, ga: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
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

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="primary" onClick={handleSave}>
                  {getMessage('save')}
                </Button>
                <Button
                  type="button"
                  variant="warning"
                  onClick={handleBlockManager}
                >
                  {getMessage('block_manager')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetConfig}
                >
                  {getMessage('reset_config')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('reset_config_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getMessage('reset_config_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetConfig}>
              {getMessage('confirm_btn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

