part of 'login_bloc.dart';

enum LoginStatus { initial, loading, success, failure }

class LoginState {
  final LoginStatus status;
  final CareXWalletAccount? account;
  final String? error;

  const LoginState({
    this.status = LoginStatus.initial,
    this.account,
    this.error,
  });

  LoginState copyWith({
    LoginStatus? status,
    CareXWalletAccount? account,
    String? error,
  }) {
    return LoginState(
      status: status ?? this.status,
      account: account ?? this.account,
      error: error,
    );
  }
}
