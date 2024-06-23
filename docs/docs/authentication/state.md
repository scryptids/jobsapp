---
sidebar_position: 1
---

# State

## Automatic login machine (currently implemented)

To be able to test Hasura authorization without needing to repeatedly enter credentials, there is a state machine that automatically logs the developer in as userId: 1 when they navigate to `/login`. A mechanism like dependency injection could be added in later to make it easier to swap out different authentication implementations

```mermaid
stateDiagram-v2
    state "Logged out" as logged_out
    state "Logged in" as logged_in

    logged_out --> logged_in : Navigate to /login
    logged_in --> logged_out : Navigate to /logout
```

## MFA state machine (prospective)


```mermaid
stateDiagram-v2
    state "Logged out" as logged_out
    state "Logged in" as logged_in

    state "2FA enabled?" as 2fa_enabled
    state if_2fa_enabled <<choice>>

    state "Valid credentials?" as valid_creds
    state if_valid_creds <<choice>>

    state "Prompt for OTP" as prompt_otp

    state "Valid OTP?" as valid_otp
    state if_valid_otp <<choice>>

    logged_out --> valid_creds : Submit credentials

    valid_creds --> if_valid_creds
    if_valid_creds --> logged_out : Invalid
    if_valid_creds --> 2fa_enabled: Valid

    2fa_enabled --> if_2fa_enabled
    if_2fa_enabled --> prompt_otp : Yes
    if_2fa_enabled --> logged_in : No

    prompt_otp --> logged_out : Timeout
    prompt_otp --> valid_otp   : Submit OTP
    valid_otp --> if_valid_otp
    if_valid_otp --> prompt_otp  : Invalid
    if_valid_otp --> logged_in   : Valid
    logged_in  --> logged_out  : Log out (manual or timeout)
```
